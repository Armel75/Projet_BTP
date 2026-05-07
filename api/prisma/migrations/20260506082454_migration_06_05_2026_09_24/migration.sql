BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Tender] DROP CONSTRAINT [Tender_evaluation_method_df],
[Tender_submission_mode_df];
ALTER TABLE [dbo].[Tender] ADD CONSTRAINT [Tender_evaluation_method_df] DEFAULT 'WEIGHTED' FOR [evaluation_method], CONSTRAINT [Tender_submission_mode_df] DEFAULT 'PLATFORM' FOR [submission_mode];

-- AlterTable
ALTER TABLE [dbo].[TenderInvitation] DROP CONSTRAINT [TenderInvitation_response_status_df];
ALTER TABLE [dbo].[TenderInvitation] ADD CONSTRAINT [TenderInvitation_response_status_df] DEFAULT 'INVITED' FOR [response_status];

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
