/*
  Warnings:

  - You are about to drop the column `document_url` on the `Contract` table. All the data in the column will be lost.
  - You are about to drop the column `document_url` on the `RFIComment` table. All the data in the column will be lost.
  - You are about to drop the column `document_url` on the `SubmittalItem` table. All the data in the column will be lost.
  - You are about to drop the column `document_url` on the `Tender` table. All the data in the column will be lost.
  - You are about to drop the column `document_url` on the `TenderBid` table. All the data in the column will be lost.
  - You are about to drop the column `document_url` on the `WorkAcceptance` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[DailyLogTaskProgress] DROP CONSTRAINT [FK_DailyLogTaskProgress_daily_log_id];

-- AlterTable
ALTER TABLE [dbo].[Contract] DROP COLUMN [document_url];
ALTER TABLE [dbo].[Contract] ADD [document_id] INT;

-- AlterTable
ALTER TABLE [dbo].[DailyLogTaskProgress] DROP CONSTRAINT [DF_DailyLogTaskProgress_task_type],
[DF_DailyLogTaskProgress_updated_at];
EXEC SP_RENAME N'dbo.PK_DailyLogTaskProgress', N'DailyLogTaskProgress_pkey';
ALTER TABLE [dbo].[DailyLogTaskProgress] ALTER COLUMN [task_type] NVARCHAR(1000) NOT NULL;
ALTER TABLE [dbo].[DailyLogTaskProgress] ADD CONSTRAINT [DailyLogTaskProgress_task_type_df] DEFAULT 'planned' FOR [task_type];

-- AlterTable
ALTER TABLE [dbo].[Document] ADD [tender_id] INT;

-- AlterTable
ALTER TABLE [dbo].[Incident] ADD [archived_at] DATETIME2,
[is_archived] BIT NOT NULL CONSTRAINT [Incident_is_archived_df] DEFAULT 0;

-- AlterTable
ALTER TABLE [dbo].[MeetingActionItem] ADD [responsible_name] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[RFIComment] DROP COLUMN [document_url];
ALTER TABLE [dbo].[RFIComment] ADD [document_id] INT;

-- AlterTable
ALTER TABLE [dbo].[SubmittalItem] DROP COLUMN [document_url];
ALTER TABLE [dbo].[SubmittalItem] ADD [document_id] INT;

-- AlterTable
ALTER TABLE [dbo].[Tender] DROP COLUMN [document_url];

-- AlterTable
ALTER TABLE [dbo].[TenderBid] DROP COLUMN [document_url];
ALTER TABLE [dbo].[TenderBid] ADD [document_id] INT;

-- AlterTable
ALTER TABLE [dbo].[WorkAcceptance] DROP COLUMN [document_url];
ALTER TABLE [dbo].[WorkAcceptance] ADD [document_id] INT;

-- CreateIndex
CREATE NONCLUSTERED INDEX [Document_tender_id_idx] ON [dbo].[Document]([tender_id]);

-- RenameForeignKey
EXEC sp_rename 'dbo.FK_DailyLogTaskProgress_task_id', 'DailyLogTaskProgress_task_id_fkey', 'OBJECT';

-- AddForeignKey
ALTER TABLE [dbo].[TenderBid] ADD CONSTRAINT [TenderBid_document_id_fkey] FOREIGN KEY ([document_id]) REFERENCES [dbo].[Document]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Contract] ADD CONSTRAINT [Contract_document_id_fkey] FOREIGN KEY ([document_id]) REFERENCES [dbo].[Document]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RFIComment] ADD CONSTRAINT [RFIComment_document_id_fkey] FOREIGN KEY ([document_id]) REFERENCES [dbo].[Document]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SubmittalItem] ADD CONSTRAINT [SubmittalItem_document_id_fkey] FOREIGN KEY ([document_id]) REFERENCES [dbo].[Document]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkAcceptance] ADD CONSTRAINT [WorkAcceptance_document_id_fkey] FOREIGN KEY ([document_id]) REFERENCES [dbo].[Document]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Document] ADD CONSTRAINT [Document_tender_id_fkey] FOREIGN KEY ([tender_id]) REFERENCES [dbo].[Tender]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[DailyLogTaskProgress] ADD CONSTRAINT [DailyLogTaskProgress_daily_log_id_fkey] FOREIGN KEY ([daily_log_id]) REFERENCES [dbo].[DailyLog]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
EXEC SP_RENAME N'dbo.DailyLogTaskProgress.IX_DailyLogTaskProgress_daily_log_id', N'DailyLogTaskProgress_daily_log_id_idx', N'INDEX';

-- RenameIndex
EXEC SP_RENAME N'dbo.DailyLogTaskProgress.IX_DailyLogTaskProgress_task_id', N'DailyLogTaskProgress_task_id_idx', N'INDEX';

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
