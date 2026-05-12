BEGIN TRY

BEGIN TRAN;

-- AlterTable: Add écart (gap) tracking columns to DailyLogTaskProgress
ALTER TABLE [dbo].[DailyLogTaskProgress] ADD
    [planned_quantity] INT,
    [actual_quantity] INT,
    [planned_date] DATETIME2,
    [actual_date] DATETIME2,
    [cause_code] NVARCHAR(100),
    [impact_type] NVARCHAR(50),
    [corrective_action] NVARCHAR(max),
    [owner_id] INT,
    [target_correction_date] DATETIME2;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0 BEGIN
    ROLLBACK TRAN;
END;
THROW;

END CATCH
