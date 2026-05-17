# Media Processing API Flow

1. **Upload Request**
   - Method: POST
   - Path: `/api/upload`
   - Body: Multipart Form Data (`image` field)
   - Action: Validates size/type, saves to disk, creates PENDING DB entry, enqueues to Redis.
   - Response: `202 Accepted` with `processingId`.

2. **Status Polling**
   - Method: GET
   - Path: `/api/upload/:id`
   - Action: Reads status from MySQL.

3. **Result Retrieval**
   - Method: GET
   - Path: `/api/result/:id`
   - Action: Reads analysis results from MySQL.
