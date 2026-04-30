/*
  Warnings:

  - You are about to drop the `UserProjectRole` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `supplier_id` to the `Delivery` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `GoodsReceipt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `MaterialConsumption` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entity_id` to the `WorkflowInstance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entity_type` to the `WorkflowInstance` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[UserProjectRole] DROP CONSTRAINT [UserProjectRole_project_id_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[UserProjectRole] DROP CONSTRAINT [UserProjectRole_user_id_fkey];

-- DropIndex
DROP INDEX [CostTransaction_project_id_idx] ON [dbo].[CostTransaction];

-- DropIndex
DROP INDEX [CostTransaction_tenant_id_idx] ON [dbo].[CostTransaction];

-- DropIndex
DROP INDEX [GoodsReceipt_project_id_idx] ON [dbo].[GoodsReceipt];

-- DropIndex
DROP INDEX [GoodsReceiptItem_item_id_idx] ON [dbo].[GoodsReceiptItem];

-- DropIndex
DROP INDEX [GoodsReceiptItem_receipt_id_idx] ON [dbo].[GoodsReceiptItem];

-- DropIndex
DROP INDEX [Incident_project_id_status_idx] ON [dbo].[Incident];

-- DropIndex
DROP INDEX [MaterialConsumption_task_id_idx] ON [dbo].[MaterialConsumption];

-- DropIndex
DROP INDEX [PurchaseOrder_project_id_idx] ON [dbo].[PurchaseOrder];

-- DropIndex
DROP INDEX [PurchaseOrder_supplier_id_idx] ON [dbo].[PurchaseOrder];

-- DropIndex
DROP INDEX [Task_project_id_idx] ON [dbo].[Task];

-- DropIndex
DROP INDEX [Task_status_idx] ON [dbo].[Task];

-- DropIndex
DROP INDEX [Task_tenant_id_idx] ON [dbo].[Task];

-- DropIndex
DROP INDEX [TaskAssignment_resource_id_idx] ON [dbo].[TaskAssignment];

-- DropIndex
DROP INDEX [TaskAssignment_task_id_idx] ON [dbo].[TaskAssignment];

-- DropIndex
DROP INDEX [WorkflowInstance_current_step_id_idx] ON [dbo].[WorkflowInstance];

-- DropIndex
DROP INDEX [WorkflowInstance_project_id_idx] ON [dbo].[WorkflowInstance];

-- AlterTable
ALTER TABLE [dbo].[Delivery] ADD [supplier_id] INT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[GoodsReceipt] ADD [tenant_id] INT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[Invoice] ADD [purchase_order_id] INT;

-- AlterTable
ALTER TABLE [dbo].[MaterialConsumption] ADD [stock_movement_id] INT,
[tenant_id] INT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[Tender] ADD [wbs_id] INT;

-- AlterTable
ALTER TABLE [dbo].[WorkflowInstance] ADD [entity_id] INT NOT NULL,
[entity_type] NVARCHAR(1000) NOT NULL;

-- DropTable
DROP TABLE [dbo].[UserProjectRole];

-- CreateTable
CREATE TABLE [dbo].[WeeklyReport] (
    [id] INT NOT NULL IDENTITY(1,1),
    [project_id] INT NOT NULL,
    [tenant_id] INT NOT NULL,
    [week_start] DATETIME2 NOT NULL,
    [week_end] DATETIME2 NOT NULL,
    [overall_progress] FLOAT(53) NOT NULL,
    [summary] NVARCHAR(max),
    [prepared_by] INT NOT NULL,
    [validated_by] INT,
    [status] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [WeeklyReport_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [WeeklyReport_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WeeklyReportItem] (
    [id] INT NOT NULL IDENTITY(1,1),
    [report_id] INT NOT NULL,
    [task_id] INT,
    [description] NVARCHAR(1000) NOT NULL,
    [weekly_progress] FLOAT(53) NOT NULL,
    [cumulative_progress] FLOAT(53) NOT NULL,
    [comment] NVARCHAR(max),
    CONSTRAINT [WeeklyReportItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Permission] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] NVARCHAR(1000) NOT NULL,
    [label] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [Permission_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Permission_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[Role] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [tenant_id] INT,
    CONSTRAINT [Role_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[RolePermission] (
    [role_id] INT NOT NULL,
    [permission_id] INT NOT NULL,
    CONSTRAINT [RolePermission_pkey] PRIMARY KEY CLUSTERED ([role_id],[permission_id])
);

-- CreateTable
CREATE TABLE [dbo].[UserRole] (
    [id] INT NOT NULL IDENTITY(1,1),
    [user_id] INT NOT NULL,
    [role_id] INT NOT NULL,
    [tenant_id] INT,
    [project_id] INT,
    CONSTRAINT [UserRole_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UserRole_user_id_role_id_project_id_key] UNIQUE NONCLUSTERED ([user_id],[role_id],[project_id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WeeklyReport_tenant_id_project_id_idx] ON [dbo].[WeeklyReport]([tenant_id], [project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RolePermission_role_id_idx] ON [dbo].[RolePermission]([role_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RolePermission_permission_id_idx] ON [dbo].[RolePermission]([permission_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [UserRole_user_id_tenant_id_idx] ON [dbo].[UserRole]([user_id], [tenant_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [UserRole_user_id_project_id_idx] ON [dbo].[UserRole]([user_id], [project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Contract_tenant_id_project_id_idx] ON [dbo].[Contract]([tenant_id], [project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Contract_status_idx] ON [dbo].[Contract]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Contract_created_at_idx] ON [dbo].[Contract]([created_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [CostTransaction_tenant_id_project_id_idx] ON [dbo].[CostTransaction]([tenant_id], [project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Delivery_supplier_id_idx] ON [dbo].[Delivery]([supplier_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GoodsReceipt_tenant_id_project_id_idx] ON [dbo].[GoodsReceipt]([tenant_id], [project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GoodsReceipt_project_id_order_id_idx] ON [dbo].[GoodsReceipt]([project_id], [order_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GoodsReceiptItem_tenant_id_project_id_idx] ON [dbo].[GoodsReceiptItem]([tenant_id], [project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GoodsReceiptItem_receipt_id_item_id_idx] ON [dbo].[GoodsReceiptItem]([receipt_id], [item_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Incident_tenant_id_project_id_idx] ON [dbo].[Incident]([tenant_id], [project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Incident_status_idx] ON [dbo].[Incident]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Incident_created_at_idx] ON [dbo].[Incident]([created_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Invoice_tenant_id_project_id_idx] ON [dbo].[Invoice]([tenant_id], [project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Invoice_status_idx] ON [dbo].[Invoice]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Invoice_created_at_idx] ON [dbo].[Invoice]([created_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Invoice_purchase_order_id_idx] ON [dbo].[Invoice]([purchase_order_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MaterialConsumption_tenant_id_project_id_idx] ON [dbo].[MaterialConsumption]([tenant_id], [project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MaterialConsumption_task_id_item_id_idx] ON [dbo].[MaterialConsumption]([task_id], [item_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MaterialConsumption_stock_movement_id_idx] ON [dbo].[MaterialConsumption]([stock_movement_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PurchaseOrder_tenant_id_project_id_idx] ON [dbo].[PurchaseOrder]([tenant_id], [project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PurchaseOrder_tenant_id_supplier_id_idx] ON [dbo].[PurchaseOrder]([tenant_id], [supplier_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PurchaseOrder_tenant_id_status_idx] ON [dbo].[PurchaseOrder]([tenant_id], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RFI_tenant_id_project_id_idx] ON [dbo].[RFI]([tenant_id], [project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RFI_status_idx] ON [dbo].[RFI]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RFI_created_at_idx] ON [dbo].[RFI]([created_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [StockMovement_project_id_item_id_idx] ON [dbo].[StockMovement]([project_id], [item_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Submittal_tenant_id_project_id_idx] ON [dbo].[Submittal]([tenant_id], [project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Submittal_status_idx] ON [dbo].[Submittal]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Submittal_created_at_idx] ON [dbo].[Submittal]([created_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Task_tenant_id_project_id_idx] ON [dbo].[Task]([tenant_id], [project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Task_tenant_id_status_idx] ON [dbo].[Task]([tenant_id], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Task_project_id_wbs_id_idx] ON [dbo].[Task]([project_id], [wbs_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskAssignment_tenant_id_task_id_idx] ON [dbo].[TaskAssignment]([tenant_id], [task_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskAssignment_tenant_id_resource_id_idx] ON [dbo].[TaskAssignment]([tenant_id], [resource_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Tender_wbs_id_idx] ON [dbo].[Tender]([wbs_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WBSNode_tenant_id_project_id_idx] ON [dbo].[WBSNode]([tenant_id], [project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WBSNode_project_id_parent_id_idx] ON [dbo].[WBSNode]([project_id], [parent_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WorkflowInstance_created_at_idx] ON [dbo].[WorkflowInstance]([created_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WorkflowInstance_tenant_id_project_id_idx] ON [dbo].[WorkflowInstance]([tenant_id], [project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WorkflowInstance_tenant_id_status_idx] ON [dbo].[WorkflowInstance]([tenant_id], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WorkflowInstance_current_step_id_status_idx] ON [dbo].[WorkflowInstance]([current_step_id], [status]);

-- AddForeignKey
ALTER TABLE [dbo].[Tender] ADD CONSTRAINT [Tender_wbs_id_fkey] FOREIGN KEY ([wbs_id]) REFERENCES [dbo].[WBSNode]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Delivery] ADD CONSTRAINT [Delivery_supplier_id_fkey] FOREIGN KEY ([supplier_id]) REFERENCES [dbo].[Supplier]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[GoodsReceipt] ADD CONSTRAINT [GoodsReceipt_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MaterialConsumption] ADD CONSTRAINT [MaterialConsumption_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MaterialConsumption] ADD CONSTRAINT [MaterialConsumption_stock_movement_id_fkey] FOREIGN KEY ([stock_movement_id]) REFERENCES [dbo].[StockMovement]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Invoice] ADD CONSTRAINT [Invoice_purchase_order_id_fkey] FOREIGN KEY ([purchase_order_id]) REFERENCES [dbo].[PurchaseOrder]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[WeeklyReport] ADD CONSTRAINT [WeeklyReport_prepared_by_fkey] FOREIGN KEY ([prepared_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WeeklyReport] ADD CONSTRAINT [WeeklyReport_validated_by_fkey] FOREIGN KEY ([validated_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WeeklyReport] ADD CONSTRAINT [WeeklyReport_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WeeklyReport] ADD CONSTRAINT [WeeklyReport_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WeeklyReportItem] ADD CONSTRAINT [WeeklyReportItem_report_id_fkey] FOREIGN KEY ([report_id]) REFERENCES [dbo].[WeeklyReport]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WeeklyReportItem] ADD CONSTRAINT [WeeklyReportItem_task_id_fkey] FOREIGN KEY ([task_id]) REFERENCES [dbo].[Task]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Role] ADD CONSTRAINT [Role_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RolePermission] ADD CONSTRAINT [RolePermission_role_id_fkey] FOREIGN KEY ([role_id]) REFERENCES [dbo].[Role]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RolePermission] ADD CONSTRAINT [RolePermission_permission_id_fkey] FOREIGN KEY ([permission_id]) REFERENCES [dbo].[Permission]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[UserRole] ADD CONSTRAINT [UserRole_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[UserRole] ADD CONSTRAINT [UserRole_role_id_fkey] FOREIGN KEY ([role_id]) REFERENCES [dbo].[Role]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[UserRole] ADD CONSTRAINT [UserRole_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserRole] ADD CONSTRAINT [UserRole_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
