/*
  Warnings:

  - You are about to drop the column `assigned_to` on the `PunchItem` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[PunchItem] DROP COLUMN [assigned_to];
ALTER TABLE [dbo].[PunchItem] ADD CONSTRAINT [PunchItem_status_df] DEFAULT 'OPEN' FOR [status];
ALTER TABLE [dbo].[PunchItem] ADD [assigned_to_id] INT,
[category] NVARCHAR(1000) NOT NULL CONSTRAINT [PunchItem_category_df] DEFAULT 'QUALITY',
[image_urls] NVARCHAR(max),
[location] NVARCHAR(1000),
[priority] NVARCHAR(1000) NOT NULL CONSTRAINT [PunchItem_priority_df] DEFAULT 'MEDIUM',
[task_id] INT;

-- CreateIndex
CREATE NONCLUSTERED INDEX [PunchItem_task_id_idx] ON [dbo].[PunchItem]([task_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PunchItem_assigned_to_id_idx] ON [dbo].[PunchItem]([assigned_to_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PunchItem_project_id_status_idx] ON [dbo].[PunchItem]([project_id], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PunchItem_tenant_id_status_idx] ON [dbo].[PunchItem]([tenant_id], [status]);

-- AddForeignKey
ALTER TABLE [dbo].[PunchItem] ADD CONSTRAINT [PunchItem_assigned_to_id_fkey] FOREIGN KEY ([assigned_to_id]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PunchItem] ADD CONSTRAINT [PunchItem_task_id_fkey] FOREIGN KEY ([task_id]) REFERENCES [dbo].[Task]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
