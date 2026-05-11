BEGIN TRY

BEGIN TRAN;

-- AlterTable: only execute if evaluation_method column already exists
-- (on fresh shadow DB replay this column does not exist yet; on real DB it was added by 20260506121000)
IF COL_LENGTH('[dbo].[Tender]', 'evaluation_method') IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'Tender_evaluation_method_df' AND parent_object_id = OBJECT_ID('[dbo].[Tender]'))
        ALTER TABLE [dbo].[Tender] DROP CONSTRAINT [Tender_evaluation_method_df];
    IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'Tender_submission_mode_df' AND parent_object_id = OBJECT_ID('[dbo].[Tender]'))
        ALTER TABLE [dbo].[Tender] DROP CONSTRAINT [Tender_submission_mode_df];
    ALTER TABLE [dbo].[Tender] ADD CONSTRAINT [Tender_evaluation_method_df] DEFAULT 'WEIGHTED' FOR [evaluation_method], CONSTRAINT [Tender_submission_mode_df] DEFAULT 'PLATFORM' FOR [submission_mode];
END;

-- AlterTable: only execute if response_status column already exists
IF COL_LENGTH('[dbo].[TenderInvitation]', 'response_status') IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'TenderInvitation_response_status_df' AND parent_object_id = OBJECT_ID('[dbo].[TenderInvitation]'))
        ALTER TABLE [dbo].[TenderInvitation] DROP CONSTRAINT [TenderInvitation_response_status_df];
    ALTER TABLE [dbo].[TenderInvitation] ADD CONSTRAINT [TenderInvitation_response_status_df] DEFAULT 'INVITED' FOR [response_status];
END;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
