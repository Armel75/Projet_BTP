/*
  Warnings:

  - Added the required column `updated_at` to the `WorkAcceptance` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[WorkAcceptance] ADD CONSTRAINT [WorkAcceptance_status_df] DEFAULT 'PENDING' FOR [status];
ALTER TABLE [dbo].[WorkAcceptance] ADD [amount_accepted] DECIMAL(15,2),
[attendees] NVARCHAR(max),
[contra_visit_date] DATETIME2,
[created_at] DATETIME2 NOT NULL CONSTRAINT [WorkAcceptance_created_at_df] DEFAULT CURRENT_TIMESTAMP,
[document_url] NVARCHAR(1000),
[inspection_date] DATETIME2,
[observations] NVARCHAR(max),
[penalty_amount] DECIMAL(15,2),
[planned_date] DATETIME2,
[reference] NVARCHAR(1000),
[reserve_count] INT NOT NULL CONSTRAINT [WorkAcceptance_reserve_count_df] DEFAULT 0,
[reserves_text] NVARCHAR(max),
[signed_by_contractor] BIT NOT NULL CONSTRAINT [WorkAcceptance_signed_by_contractor_df] DEFAULT 0,
[signed_by_owner] BIT NOT NULL CONSTRAINT [WorkAcceptance_signed_by_owner_df] DEFAULT 0,
[updated_at] DATETIME2 NOT NULL,
[warranty_end_date] DATETIME2,
[warranty_months] INT NOT NULL CONSTRAINT [WorkAcceptance_warranty_months_df] DEFAULT 12;

-- CreateIndex
CREATE NONCLUSTERED INDEX [WorkAcceptance_project_id_status_idx] ON [dbo].[WorkAcceptance]([project_id], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WorkAcceptance_tenant_id_status_idx] ON [dbo].[WorkAcceptance]([tenant_id], [status]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
