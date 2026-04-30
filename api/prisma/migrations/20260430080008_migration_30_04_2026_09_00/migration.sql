/*
  Warnings:

  - A unique constraint covering the columns `[project_id,lot_number]` on the table `ProjectLot` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `title` to the `ChangeOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Contract` table without a default value. This is not possible if the table is not empty.
  - Added the required column `invoice_date` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lot_number` to the `ProjectLot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `trade_code` to the `ProjectLot` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[BudgetLine] ADD [lot_id] INT;

-- AlterTable
ALTER TABLE [dbo].[ChangeOrder] ADD [impact_days] INT,
[lot_id] INT,
[reason] NVARCHAR(max),
[title] NVARCHAR(1000) NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[Contract] ADD [amount] FLOAT(53) NOT NULL CONSTRAINT [Contract_amount_df] DEFAULT 0,
[end_date] DATETIME2,
[signed_at] DATETIME2,
[start_date] DATETIME2,
[title] NVARCHAR(1000) NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[ControlReport] ADD [lot_id] INT,
[report_date] DATETIME2,
[title] NVARCHAR(1000),
[type] NVARCHAR(1000) NOT NULL CONSTRAINT [ControlReport_type_df] DEFAULT 'QUALITY';

-- AlterTable
ALTER TABLE [dbo].[Document] ADD [lot_id] INT;

-- AlterTable
ALTER TABLE [dbo].[Incident] ADD [corrective_action] NVARCHAR(max),
[location] NVARCHAR(1000),
[lot_id] INT,
[title] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[Inspection] ADD [lot_id] INT;

-- AlterTable
ALTER TABLE [dbo].[InventoryItem] ADD [category] NVARCHAR(1000),
[code] NVARCHAR(1000),
[description] NVARCHAR(max),
[unit_cost] FLOAT(53);

-- AlterTable
ALTER TABLE [dbo].[Invoice] ADD [invoice_date] DATETIME2 NOT NULL,
[lot_id] INT;

-- AlterTable
ALTER TABLE [dbo].[Project] ADD [client_name] NVARCHAR(1000),
[description] NVARCHAR(max),
[phase] NVARCHAR(1000) NOT NULL CONSTRAINT [Project_phase_df] DEFAULT 'PREPARATION',
[project_manager_id] INT;

-- AlterTable
ALTER TABLE [dbo].[ProjectLot] ADD [budget_allocated] FLOAT(53) NOT NULL CONSTRAINT [ProjectLot_budget_allocated_df] DEFAULT 0,
[contract_id] INT,
[contractor_id] INT,
[end_date] DATETIME2,
[lot_number] NVARCHAR(1000) NOT NULL,
[progress] FLOAT(53) NOT NULL CONSTRAINT [ProjectLot_progress_df] DEFAULT 0,
[responsible_id] INT,
[start_date] DATETIME2,
[status] NVARCHAR(1000) NOT NULL CONSTRAINT [ProjectLot_status_df] DEFAULT 'CONCEPTION',
[trade_code] NVARCHAR(1000) NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[PunchItem] ADD [lot_id] INT;

-- AlterTable
ALTER TABLE [dbo].[PurchaseOrder] ADD [delivery_date] DATETIME2,
[lot_id] INT,
[notes] NVARCHAR(max),
[number] NVARCHAR(1000),
[title] NVARCHAR(1000),
[total_amount] FLOAT(53) NOT NULL CONSTRAINT [PurchaseOrder_total_amount_df] DEFAULT 0;

-- AlterTable
ALTER TABLE [dbo].[Supplier] ADD [address] NVARCHAR(max),
[contact_name] NVARCHAR(1000),
[email] NVARCHAR(1000),
[phone] NVARCHAR(1000),
[siret] NVARCHAR(1000),
[specialty] NVARCHAR(1000),
[status] NVARCHAR(1000) NOT NULL CONSTRAINT [Supplier_status_df] DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE [dbo].[Task] ADD [actual_end] DATETIME2,
[actual_start] DATETIME2,
[description] NVARCHAR(max),
[lot_id] INT,
[priority] NVARCHAR(1000) NOT NULL CONSTRAINT [Task_priority_df] DEFAULT 'MEDIUM';

-- AlterTable
ALTER TABLE [dbo].[Tender] ADD [budget_estimate] FLOAT(53),
[description] NVARCHAR(max),
[lot_id] INT,
[opening_date] DATETIME2,
[submission_deadline] DATETIME2,
[type] NVARCHAR(1000) NOT NULL CONSTRAINT [Tender_type_df] DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE [dbo].[WBSNode] ADD [lot_id] INT;

-- AlterTable
ALTER TABLE [dbo].[WorkAcceptance] ADD [inspector_id] INT,
[lot_id] INT,
[notes] NVARCHAR(max),
[title] NVARCHAR(1000),
[type] NVARCHAR(1000) NOT NULL CONSTRAINT [WorkAcceptance_type_df] DEFAULT 'PROVISIONAL';

-- CreateTable
CREATE TABLE [dbo].[GLPIUser] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenant_id] INT NOT NULL,
    [glpi_id] INT NOT NULL,
    [login] NVARCHAR(1000),
    [email] NVARCHAR(1000),
    [first_name] NVARCHAR(1000),
    [last_name] NVARCHAR(1000),
    [full_name] NVARCHAR(1000),
    [phone] NVARCHAR(1000),
    [department_name] NVARCHAR(1000),
    [entity_name] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [GLPIUser_status_df] DEFAULT 'ACTIVE',
    [is_deleted_in_source] BIT NOT NULL CONSTRAINT [GLPIUser_is_deleted_in_source_df] DEFAULT 0,
    [source_updated_at] DATETIME2,
    [last_synced_at] DATETIME2,
    [sync_status] NVARCHAR(1000) NOT NULL CONSTRAINT [GLPIUser_sync_status_df] DEFAULT 'SYNCED',
    [raw_payload] NVARCHAR(max),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [GLPIUser_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [GLPIUser_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [GLPIUser_tenant_id_glpi_id_key] UNIQUE NONCLUSTERED ([tenant_id],[glpi_id])
);

-- CreateTable
CREATE TABLE [dbo].[Ticket] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenant_id] INT NOT NULL,
    [glpi_id] INT NOT NULL,
    [ticket_number] NVARCHAR(1000),
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max),
    [ticket_type] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Ticket_status_df] DEFAULT 'OPEN',
    [priority] NVARCHAR(1000),
    [urgency] NVARCHAR(1000),
    [impact] NVARCHAR(1000),
    [category_name] NVARCHAR(1000),
    [entity_name] NVARCHAR(1000),
    [location_name] NVARCHAR(1000),
    [opened_at] DATETIME2,
    [due_at] DATETIME2,
    [resolved_at] DATETIME2,
    [closed_at] DATETIME2,
    [requester_glpi_user_id] INT,
    [assignee_glpi_user_id] INT,
    [source_updated_at] DATETIME2,
    [last_synced_at] DATETIME2,
    [sync_status] NVARCHAR(1000) NOT NULL CONSTRAINT [Ticket_sync_status_df] DEFAULT 'SYNCED',
    [raw_payload] NVARCHAR(max),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Ticket_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [Ticket_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Ticket_tenant_id_glpi_id_key] UNIQUE NONCLUSTERED ([tenant_id],[glpi_id])
);

-- CreateTable
CREATE TABLE [dbo].[TradeCategory] (
    [code] NVARCHAR(1000) NOT NULL,
    [label] NVARCHAR(1000) NOT NULL,
    [order] INT NOT NULL CONSTRAINT [TradeCategory_order_df] DEFAULT 0,
    CONSTRAINT [TradeCategory_pkey] PRIMARY KEY CLUSTERED ([code])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GLPIUser_tenant_id_email_idx] ON [dbo].[GLPIUser]([tenant_id], [email]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GLPIUser_tenant_id_login_idx] ON [dbo].[GLPIUser]([tenant_id], [login]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GLPIUser_tenant_id_status_idx] ON [dbo].[GLPIUser]([tenant_id], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Ticket_tenant_id_status_idx] ON [dbo].[Ticket]([tenant_id], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Ticket_tenant_id_ticket_number_idx] ON [dbo].[Ticket]([tenant_id], [ticket_number]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Ticket_requester_glpi_user_id_idx] ON [dbo].[Ticket]([requester_glpi_user_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Ticket_assignee_glpi_user_id_idx] ON [dbo].[Ticket]([assignee_glpi_user_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BudgetLine_lot_id_idx] ON [dbo].[BudgetLine]([lot_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ChangeOrder_lot_id_idx] ON [dbo].[ChangeOrder]([lot_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ControlReport_lot_id_idx] ON [dbo].[ControlReport]([lot_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Document_lot_id_idx] ON [dbo].[Document]([lot_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Incident_lot_id_idx] ON [dbo].[Incident]([lot_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Inspection_lot_id_idx] ON [dbo].[Inspection]([lot_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Invoice_lot_id_idx] ON [dbo].[Invoice]([lot_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ProjectLot_project_id_trade_code_idx] ON [dbo].[ProjectLot]([project_id], [trade_code]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ProjectLot_project_id_status_idx] ON [dbo].[ProjectLot]([project_id], [status]);

-- CreateIndex
ALTER TABLE [dbo].[ProjectLot] ADD CONSTRAINT [ProjectLot_project_id_lot_number_key] UNIQUE NONCLUSTERED ([project_id], [lot_number]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PunchItem_lot_id_idx] ON [dbo].[PunchItem]([lot_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PurchaseOrder_lot_id_idx] ON [dbo].[PurchaseOrder]([lot_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Task_lot_id_idx] ON [dbo].[Task]([lot_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Tender_lot_id_idx] ON [dbo].[Tender]([lot_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WBSNode_lot_id_idx] ON [dbo].[WBSNode]([lot_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WorkAcceptance_lot_id_idx] ON [dbo].[WorkAcceptance]([lot_id]);

-- AddForeignKey
ALTER TABLE [dbo].[GLPIUser] ADD CONSTRAINT [GLPIUser_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Ticket] ADD CONSTRAINT [Ticket_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Ticket] ADD CONSTRAINT [Ticket_requester_glpi_user_id_fkey] FOREIGN KEY ([requester_glpi_user_id]) REFERENCES [dbo].[GLPIUser]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Ticket] ADD CONSTRAINT [Ticket_assignee_glpi_user_id_fkey] FOREIGN KEY ([assignee_glpi_user_id]) REFERENCES [dbo].[GLPIUser]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Project] ADD CONSTRAINT [Project_project_manager_id_fkey] FOREIGN KEY ([project_manager_id]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ProjectLot] ADD CONSTRAINT [ProjectLot_trade_code_fkey] FOREIGN KEY ([trade_code]) REFERENCES [dbo].[TradeCategory]([code]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ProjectLot] ADD CONSTRAINT [ProjectLot_responsible_id_fkey] FOREIGN KEY ([responsible_id]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ProjectLot] ADD CONSTRAINT [ProjectLot_contractor_id_fkey] FOREIGN KEY ([contractor_id]) REFERENCES [dbo].[Supplier]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ProjectLot] ADD CONSTRAINT [ProjectLot_contract_id_fkey] FOREIGN KEY ([contract_id]) REFERENCES [dbo].[Contract]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WBSNode] ADD CONSTRAINT [WBSNode_lot_id_fkey] FOREIGN KEY ([lot_id]) REFERENCES [dbo].[ProjectLot]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Task] ADD CONSTRAINT [Task_lot_id_fkey] FOREIGN KEY ([lot_id]) REFERENCES [dbo].[ProjectLot]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Tender] ADD CONSTRAINT [Tender_lot_id_fkey] FOREIGN KEY ([lot_id]) REFERENCES [dbo].[ProjectLot]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PurchaseOrder] ADD CONSTRAINT [PurchaseOrder_lot_id_fkey] FOREIGN KEY ([lot_id]) REFERENCES [dbo].[ProjectLot]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ChangeOrder] ADD CONSTRAINT [ChangeOrder_lot_id_fkey] FOREIGN KEY ([lot_id]) REFERENCES [dbo].[ProjectLot]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BudgetLine] ADD CONSTRAINT [BudgetLine_lot_id_fkey] FOREIGN KEY ([lot_id]) REFERENCES [dbo].[ProjectLot]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Invoice] ADD CONSTRAINT [Invoice_lot_id_fkey] FOREIGN KEY ([lot_id]) REFERENCES [dbo].[ProjectLot]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ControlReport] ADD CONSTRAINT [ControlReport_lot_id_fkey] FOREIGN KEY ([lot_id]) REFERENCES [dbo].[ProjectLot]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkAcceptance] ADD CONSTRAINT [WorkAcceptance_inspector_id_fkey] FOREIGN KEY ([inspector_id]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkAcceptance] ADD CONSTRAINT [WorkAcceptance_lot_id_fkey] FOREIGN KEY ([lot_id]) REFERENCES [dbo].[ProjectLot]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Incident] ADD CONSTRAINT [Incident_lot_id_fkey] FOREIGN KEY ([lot_id]) REFERENCES [dbo].[ProjectLot]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Document] ADD CONSTRAINT [Document_lot_id_fkey] FOREIGN KEY ([lot_id]) REFERENCES [dbo].[ProjectLot]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Inspection] ADD CONSTRAINT [Inspection_lot_id_fkey] FOREIGN KEY ([lot_id]) REFERENCES [dbo].[ProjectLot]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PunchItem] ADD CONSTRAINT [PunchItem_lot_id_fkey] FOREIGN KEY ([lot_id]) REFERENCES [dbo].[ProjectLot]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
