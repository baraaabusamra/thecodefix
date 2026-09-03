CREATE UNIQUE INDEX "pipeline_collection_job_one_active_per_target" ON "pipeline_collection_job" USING btree ("universityId",COALESCE("programId", '')) WHERE
      "pipeline_collection_job"."status" IN ('pending','searching','downloading','parsing','extracting','validating')
      OR ("pipeline_collection_job"."status" = 'failed' AND "pipeline_collection_job"."retryCount" < "pipeline_collection_job"."maxRetries")
    ;
