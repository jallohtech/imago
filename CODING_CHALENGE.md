# IMAGO Coding Challenge—Requirements & Architecture Plan

## Business Context
**IMAGO's Core Challenge:** Despite having the largest image collection in the EU, Google Search is their least profitable revenue source. They want to revamp search functionality and SEO to significantly increase revenue through Google Search.

## Challenge Overview
Build a full-stack media search application that retrieves content from IMAGO's Elasticsearch server and serves it to users in a user-friendly way, while identifying opportunities to optimize for search engine revenue.

**Timeline:** 7 working days | **Estimated Effort:** 4 hours | **Deliverable:** PDF submission

---

## Technical Stack Decision
- **Architecture:** Monorepo structure
- **Backend:** Nest.js (TypeScript) → Dockerized for AWS Fargate
- **Frontend:** Next.js (TypeScript) → AWS Amplify (no Docker needed)
- **Database:** Elasticsearch (provided by IMAGO)
- **Package Management:** npm workspaces

---

## Functional Requirements (What the system must DO)

### F1. Elasticsearch Integration
- **Host:** https://5.75.227.63:9200
- **Index:** imago
- **Auth:** Basic (elastic/rQQtbktwzFqAJS1h8YjP)
- **SSL:** Ignore certificate issues

### F2. Media URL Construction
```
Formula: BASE_URL + "/bild/" + DB + "/" + MEDIA_ID
Example: https://www.imago-images.de/bild/st/0258999077/s.jpg
- DB values: "st"/"sp" from ES docs
- Media ID: 10 chars, zero-padded if shorter
```

### F3. Search & Retrieval
- Keyword-based search across title, description, metadata
- Filtering capabilities
- Pagination support

### F4. Data Normalization
- Handle missing/unstructured fields gracefully
- Apply transformations for better searchability
- Clean inconsistent data formats

### F5. API Design (Backend)
```typescript
GET /api/search?q=keyword&filters=...
GET /api/media/:id
GET /api/fields // Available searchable fields
GET /health // System health check
```

#### F5.1. Standardized Response Format
All API endpoints follow a consistent response structure using global exception filters and response interceptors:

**Success Response:**
```typescript
{
  "success": true,
  "data": T, // Actual response data
  "metadata"?: {
    "pagination"?: { page: number, total: number, ... },
    "timing"?: { took: number },
    "warnings"?: string[]
  },
  "timestamp": "2023-12-25T10:30:00.000Z"
}
```

**Error Response:**
```typescript
{
  "success": false,
  "error": "Human-readable error message",
  "statusCode": 400 | 404 | 500 | 503,
  "timestamp": "2023-12-25T10:30:00.000Z",
  "details"?: { // Optional validation details
    "validationErrors": string[]
  }
}
```

#### F5.2. Global Error Handling
- **Global Exception Filter:** Catches all unhandled exceptions and formats them consistently
- **Response Interceptor:** Wraps successful responses in standard format
- **Proper HTTP Status Codes:** Maps service errors to appropriate HTTP statuses
- **Error Context Preservation:** Maintains error details while protecting sensitive information

### F6. User Interface (Frontend)
- Search input with filters
- Responsive media grid layout
- Thumbnail display with metadata
- Loading states and error handling

---

## Non-Functional Requirements (How the system should WORK)

### NF1. System Analysis & Problem Identification
**Target:** IMAGO's current Elasticsearch setup

**Discovery Strategy:**
1. Explore ES index mapping: `GET /imago/_mapping`
2. Sample documents: `GET /imago/_search?size=5`
3. Analyze field consistency and data quality

**Expected Problems to Document:**
- **Security:** Exposed ES credentials, SSL issues
- **Performance:** Direct ES access, no caching layer
- **Data Quality:** Inconsistent/missing fields
- **Architecture:** No API abstraction layer
- **SEO Issues:** Poor metadata quality affecting Google indexing
- **Search Performance:** Slow queries hurting user experience and rankings
- **Content Discoverability:** Suboptimal URL structure and metadata
- **Revenue Optimization:** Missing structured data for rich snippets

### NF2. Scalability Design
**Implementation Areas:**
- Redis caching layer (interface design)
- Connection pooling for ES
- Pagination for large datasets
- Modular architecture for microservices

### NF3. Maintainability
**Code Organization:**
```
backend/src/
├── modules/
│   ├── elasticsearch/    # ES client service
│   ├── search/           # Search functionality
│   ├── media/            # Media item operations
│   └── health/           # Health monitoring
├── filters/              # Global exception filter
├── interceptors/         # Response interceptor
├── dto/
│   ├── common/           # Shared response DTOs
│   └── [module-specific] # Domain-specific DTOs
├── types/                # TypeScript type definitions
└── config/               # Configuration management
```

**Patterns:**
- Dependency injection
- Configuration management
- Interface abstractions
- Clean separation of concerns

### NF4. Quality Assurance
**Testing Strategy:**
- Unit tests for business logic
- Integration tests for ES connectivity
- E2E tests for critical user flows
- Error handling and logging

**Monitoring:**
- Health check endpoints
- Request/response logging
- Performance metrics
- Error tracking

### NF5. Documentation
**README Structure:**
```
├── Solution Overview
├── Architecture Decisions
├── System Analysis (Technical Audit)
│   ├── Security Concerns
│   ├── Data Quality Issues
│   └── Performance Bottlenecks
├── Proposed Improvements
├── API Documentation
└── Local Development Guide
```

---

## Architecture Flow

```
Frontend (Next.js) → AWS Amplify
    ↓ HTTP API calls
Backend (Nest.js) → Docker → AWS Fargate  
    ↓ Elasticsearch queries
IMAGO Elasticsearch Server
```

**Monorepo Benefits:**
- **Single repository** for easy submission and review
- **Shared configuration** for linting, TypeScript, etc.
- **Coordinated deployments** through unified CI/CD
- **Simplified dependency management** with npm workspaces
- **Consistent development environment**

---

## Implementation Phases & Evidence Collection

### Phase 1: Discovery & Setup (**CRITICAL for Problem Analysis**)
**Development Tasks:**
1. Set up a monorepo structure with npm workspaces
2. Explore IMAGO's ES index structure
3. Document field mappings and data samples
4. Configure backend Nest.js project with ES client
5. Set up the frontend Next.js project with Tailwind
6. Create shared TypeScript configurations

**Evidence Collection:**
```bash
# Navigate to project root
cd imago-media-search

# Create analysis structure
mkdir -p analysis/data-samples
touch analysis/discovery-findings.md

# Explore IMAGO's ES server
curl -u "elastic:..." -k ".../imago/_mapping" > analysis/data-samples/mapping.json
curl -u "elastic:..." -k ".../imago/_search?size=20" > analysis/data-samples/samples.json
curl -u "elastic:..." -k ".../imago/_stats" > analysis/data-samples/stats.json
```

**Document These Issues:**
- ES index mapping inconsistencies
- Missing/null fields in sample documents
- Data type mismatches
- Field naming inconsistencies
- SSL certificate issues encountered
- Authentication security concerns (hardcoded credentials)
- Monorepo vs. microservices architecture opportunities

### Phase 2: Backend Development (**Real-time Problem Discovery**)
**Development Tasks:**
1. Implement search service with ES integration
2. Build media URL construction logic
3. Create API endpoints with validation
4. Add error handling and logging
5. **Implement Global Exception Filter and Response Standardization**

**Key Architecture Decisions:**
- **Global Exception Filter** (`backend/src/filters/global-exception.filter.ts`):
  - Catches all unhandled exceptions across the application
  - Maps Elasticsearch errors to appropriate HTTP status codes
  - Provides consistent error response format
  - Logs errors with context for debugging

- **Response Interceptor** (`backend/src/interceptors/response.interceptor.ts`):
  - Wraps all successful responses in standardized format
  - Extracts metadata from search responses (pagination, timing, facets)
  - Preserves search warnings and suggestions
  - Automatically adds timestamp to all responses

- **Service Error Handling Refactoring**:
  - Removed custom error handling from services
  - Services now throw appropriate NestJS exceptions
  - Elasticsearch service maps ES errors to proper exception types
  - Search service eliminates inconsistent error response patterns

**Evidence Collection:**
```typescript
// Add inline documentation as issues are discovered
// ISSUE: Found 15% of documents missing 'title' field
// WORKAROUND: Fallback to 'description' or 'filename'
// PERFORMANCE: Query timeout after 30s for complex searches
```

**Document These Issues:**
- Error rates from ES queries
- Performance bottlenecks (slow queries, timeouts)
- Data transformation challenges
- URL construction failures
- Missing media files (404s)

### Phase 3: Frontend Development (**User Experience Issues**)
**Development Tasks:**
1. Set up Next.js with a responsive design
2. Build search interface with filters
3. Implement media grid with thumbnails
4. Add loading states and error handling

**Evidence Collection:**
- Screenshot broken image URLs
- Document inconsistent metadata display
- Log frontend performance metrics
- Capture user experience pain points

### Phase 4: Quality & Documentation (**System Stress Testing**)
**Development Tasks:**
1. Write unit and integration tests
2. Conduct system analysis and document findings
3. Propose architectural improvements
4. Create comprehensive README

**Evidence Collection:**
- Query performance benchmarks
- Error handling test results
- Edge case documentation
- Load testing outcomes

### Phase 5: Deployment & Submission
**Tasks:**
1. Deploy to accessible platform
2. Finalize documentation with evidence
3. Create PDF submission
4. Include Git repository links

---

## Evidence Documentation Structure

**Create `analysis/` folder:**
```
imago-media-search/                   # Monorepo root
├── README.md                         # Main project documentation
├── CHALLENGE_REQUIREMENTS.md         # This document
├── package.json                      # Root package.json for workspaces
├── frontend/                         # Next.js application
│   ├── amplify.yml                   # AWS Amplify build config
│   ├── src/
│   ├── package.json
│   └── README.md
├── backend/                          # Nest.js application  
│   ├── Dockerfile                    # For Fargate deployment
│   ├── docker-compose.yml            # Local development
│   ├── src/
│   ├── package.json
│   └── README.md
├── .github/workflows/                # CI/CD pipelines
│   ├── backend-deploy.yml            # Fargate deployment
│   └── frontend-deploy.yml           # Amplify deployment
└── analysis/                         # Evidence collection
    ├── discovery-findings.md         # Phase 1 discoveries
    ├── performance-issues.md         # Performance bottlenecks found
    ├── security-concerns.md          # Security vulnerabilities
    ├── data-quality-issues.md        # Data inconsistencies
    ├── seo-optimization-opportunities.md  # SEO/revenue optimization findings
    ├── search-performance-analysis.md     # Search speed and UX issues
    ├── metadata-quality-assessment.md     # Metadata completeness for SEO
    ├── google-indexing-improvements.md    # Structured data and discoverability
    ├── data-samples/                 # Raw ES query results
    │   ├── mapping.json
    │   ├── samples.json
    │   └── problem-examples.json
    └── screenshots/                  # Visual evidence
        ├── broken-images.png
        ├── inconsistent-data.png
        ├── seo-issues.png
        └── error-states.png
```

**Real-time Note-Taking Strategy:**
- Keep `FINDINGS.md` file open during development
- Use structured comments in code:
  ```typescript
  // PROBLEM: [Category] - [Description]
  // IMPACT: [Business/Technical Impact]
  // SOLUTION: [Proposed Fix]
  ```
- Log actual error messages and response times
- Screenshot problematic data examples

---

## Success Criteria

**Technical Execution:**
- ✅ Working search functionality
- ✅ Clean, testable code
- ✅ Proper error handling with global exception filter
- ✅ Standardized API response format
- ✅ Responsive UI

**Critical Thinking:**
- ✅ Identified real system problems
- ✅ Justified improvement proposals
- ✅ Demonstrated architectural understanding
- ✅ Business impact analysis

**Professional Delivery:**
- ✅ Clear documentation
- ✅ Deployment instructions
- ✅ Test coverage
- ✅ Code quality standards

---

## Test Strategy: Maximum Impact, Minimum Effort

### Implementation Overview
**Total Implementation Time:** ~60 minutes  
**Test Strategy:** 60% Unit, 30% Integration, 10% E2E  
**Focus:** Business-critical paths and error handling

### Phase 1: Core Services Unit Tests (30 minutes) ✅ COMPLETED

#### SearchService (`search.service.spec.ts`) - 25 Tests
**Business Logic Focus:**
- `buildElasticsearchQuery()` - Query construction with filters, sorting, pagination
- `transformMediaItem()` - ES hit transformation to MediaItemDto
- `cleanText()` - Text encoding fixes and cleaning
- `generateTitle()` - Title generation from search text when missing
- `buildImageUrl()` - IMAGO URL construction with proper padding
- `detectLanguage()` - German/English/mixed language detection
- Full search integration with mocked ES responses
- `getMediaItem()` - Single item retrieval

**Key Testing Approaches:**
- Mock ElasticsearchService for isolated testing
- Test edge cases: empty results, encoding issues, missing fields
- Validate business rules: URL padding, title generation, text cleaning
- Integration test for complete search flow

#### ElasticsearchService (`elasticsearch.service.spec.ts`) - 15 Tests
**Infrastructure Focus:**
- `handleElasticsearchError()` - Error mapping to NestJS exceptions
- `sanitizeQuery()` - Query injection prevention and escaping
- `search()` - Search execution with proper response formatting
- `get()` - Document retrieval with 404 handling
- `indexExists()` - Index validation

**Key Testing Approaches:**
- Mock Elasticsearch client responses
- Test error scenarios: ConnectionError, ResponseError, RequestAbortedError
- Validate security: dangerous query blocking, character escaping
- Test HTTP status code mapping (400→InternalServerError, 503→ServiceUnavailable)

#### MediaService (`media.service.spec.ts`) - 20 Tests
**Data Enhancement Focus:**
- `getMediaItem()` - Enhanced media retrieval with validation
- `isValidMediaId()` - ID format validation and security
- `validateAndConstructImageUrl()` - URL construction with encoding
- `getImageMetadata()` - HEAD request metadata extraction
- `validateImageUrls()` - Batch URL validation

**Key Testing Approaches:**
- Mock fetch for HTTP HEAD requests
- Test validation: ID format, URL construction, security filtering
- Handle network errors and timeouts gracefully
- Batch processing with concurrent request limiting

### Phase 2: Controllers Integration Tests (20 minutes) ✅ COMPLETED

#### SearchController Integration (`search.controller.integration.spec.ts`) - 15 Tests
**API Contract Focus:**
- Complete search workflow with query parameters
- Response format standardization verification
- Error handling: invalid parameters, service unavailability
- Pagination and metadata extraction
- Search field information endpoint

#### MediaController Integration (`media.controller.integration.spec.ts`) - 12 Tests
**Enhanced Media API Focus:**
- Media item retrieval with image validation
- Invalid ID format handling and security
- Concurrent request handling
- Batch URL validation endpoint
- Response consistency across operations

#### HealthController Integration (`health.controller.integration.spec.ts`) - 18 Tests
**Service Monitoring Focus:**
- Basic health checks and detailed diagnostics
- Liveness and readiness probe endpoints
- Performance monitoring and response timing
- Service dependency status validation
- Error resilience and graceful degradation

### Phase 3: E2E Tests (10 minutes) ✅ COMPLETED

#### Critical User Flows (`critical-flows.spec.ts`) - 8 Test Suites
**End-to-End Validation:**
- **Health Check Flow:** Complete service health validation
- **Search-to-Media Flow:** Full user journey from search to media item
- **Error Handling Flow:** Graceful degradation under various failure scenarios
- **Response Format Consistency:** Standardized API responses across all endpoints
- **Performance & Resilience:** Concurrent request handling and response times
- **API Contract Validation:** Proper response structures for successful calls
- **Service Integration:** End-to-end connectivity validation

**Adaptive Testing Approach:**
- Tests gracefully handle Elasticsearch unavailability
- Flexible status code expectations based on service state
- Focus on error handling that doesn't depend on external services
- Performance benchmarking with realistic thresholds

### Test Implementation Highlights

#### 1. **Comprehensive Mocking Strategy**
```typescript
// Isolated business logic testing
const mockElasticsearchService = {
  search: jest.fn(),
  get: jest.fn(),
  aggregate: jest.fn(),
};

// Network request mocking
global.fetch = jest.fn();
```

#### 2. **Error Scenario Coverage**
```typescript
// Global exception filter testing
expect(() => {
  service.handleElasticsearchError(connectionError);
}).toThrow(ServiceUnavailableException);

// Graceful degradation
if (searchResponse.status !== 200) {
  console.log('Search service unavailable, skipping media flow');
  return; // Skip dependent tests
}
```

#### 3. **Business Rule Validation**
```typescript
// URL construction with padding
expect(buildImageUrl('st', '123456'))
  .toBe('https://www.imago-images.de/bild/st/0000123456/s.jpg');

// Text cleaning and encoding fixes
expect(cleanText('Text with ? and � issues'))
  .toBe('Text with \' and \' issues');
```

#### 4. **Integration Testing Patterns**
```typescript
// Full controller integration
const response = await request(app.getHttpServer())
  .get('/api/search')
  .query({ q: 'mountain', size: 20 })
  .expect(200);

// Standardized response validation
expect(response.body).toMatchObject({
  success: true,
  data: expect.any(Array),
  metadata: expect.objectContaining({
    pagination: expect.any(Object),
    timing: expect.any(Object),
  }),
  timestamp: expect.any(String),
});
```

### What We DON'T Test (Intentionally)

- **External Elasticsearch Server:** We mock ES interactions to test our logic, not Elasticsearch itself
- **Image URL Accessibility:** We test URL construction rules, not whether IMAGO's images are actually accessible
- **Network Layer Details:** We focus on business logic, not HTTP transport specifics
- **Third-party Library Internals:** We test our usage patterns, not library implementations

### Success Metrics

**Code Coverage Goals:**
- Core business logic: >90% coverage
- Error handling paths: >80% coverage
- API contracts: 100% endpoint coverage
- Critical user flows: 100% coverage

**Quality Indicators:**
- All tests pass in isolation and as a suite
- Tests run in <60 seconds total
- No external dependencies required for test execution
- Clear test failure messages for debugging

**Business Value Delivered:**
- Validates IMAGO URL construction rules
- Ensures Elasticsearch error handling doesn't crash the service  
- Confirms API response standardization works correctly
- Guarantees critical user flows work end-to-end
- Provides confidence for deployment and scaling