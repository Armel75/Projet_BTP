BEGIN TRY

BEGIN TRAN;

-- AlterTable: Add contractual proof metadata columns to DailyLogTaskProgress
ALTER TABLE [dbo].[DailyLogTaskProgress] ADD
    [proof_timestamp] DATETIME2,
    [proof_location] NVARCHAR(500),
    [proof_author_id] INT,
    [related_anomaly_id] INT;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0 BEGIN
    ROLLBACK TRAN;
END;
THROW;

END CATCH
