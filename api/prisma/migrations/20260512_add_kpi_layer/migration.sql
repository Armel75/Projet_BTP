BEGIN TRY

BEGIN TRAN;

-- AlterTable: Add premium KPI layer columns to WeeklyReport
ALTER TABLE [dbo].[WeeklyReport] ADD
    [productivity_score] FLOAT,
    [planning_variance_pct] FLOAT,
    [cost_variance_pct] FLOAT,
    [overdue_actions_count] INT CONSTRAINT [WeeklyReport_overdue_actions_count_df] DEFAULT 0,
    [incident_trend] NVARCHAR(50),
    [forecast_2weeks] NVARCHAR(max);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0 BEGIN
    ROLLBACK TRAN;
END;
THROW;

END CATCH
