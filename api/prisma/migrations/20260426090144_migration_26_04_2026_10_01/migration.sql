/*
  Warnings:

  - Added the required column `created_by` to the `Delivery` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `GoodsReceipt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `GoodsReceiptItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `InventoryItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `MaterialConsumption` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `ProjectStock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `PurchaseOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `StockMovement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `Supplier` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `Tender` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `TenderBid` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[ChangeOrder] ADD [created_by] INT;

-- AlterTable
ALTER TABLE [dbo].[Contract] ADD [created_by] INT;

-- AlterTable
ALTER TABLE [dbo].[ControlReport] ADD [created_by] INT;

-- AlterTable
ALTER TABLE [dbo].[CostTransaction] ADD [created_by] INT;

-- AlterTable
ALTER TABLE [dbo].[DailyLog] ADD [created_by] INT;

-- AlterTable
ALTER TABLE [dbo].[Delivery] ADD [created_by] INT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[Document] ADD [created_by] INT;

-- AlterTable
ALTER TABLE [dbo].[DocumentExchange] ADD [created_by] INT;

-- AlterTable
ALTER TABLE [dbo].[GoodsReceipt] ADD [created_by] INT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[GoodsReceiptItem] ADD [created_by] INT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[Incident] ADD [created_by] INT;

-- AlterTable
ALTER TABLE [dbo].[Inspection] ADD [created_by] INT;

-- AlterTable
ALTER TABLE [dbo].[InventoryItem] ADD [created_by] INT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[Invoice] ADD [created_by] INT;

-- AlterTable
ALTER TABLE [dbo].[MaterialConsumption] ADD [created_by] INT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[Meeting] ADD [created_by] INT;

-- AlterTable
ALTER TABLE [dbo].[Payment] ADD [created_by] INT;

-- AlterTable
ALTER TABLE [dbo].[ProjectStock] ADD [created_by] INT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[PunchItem] ADD [created_by] INT;

-- AlterTable
ALTER TABLE [dbo].[PurchaseOrder] ADD [created_by] INT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[StockMovement] ADD [created_by] INT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[Supplier] ADD [created_by] INT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[Task] ADD [created_by] INT;

-- AlterTable
ALTER TABLE [dbo].[TaskAssignment] ADD [created_by] INT;

-- AlterTable
ALTER TABLE [dbo].[Tender] ADD [created_by] INT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[TenderBid] ADD [created_by] INT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[WeeklyReport] ADD [created_by] INT;

-- AlterTable
ALTER TABLE [dbo].[WorkAcceptance] ADD [created_by] INT;

-- AlterTable
ALTER TABLE [dbo].[WorkflowDefinition] ADD [created_by] INT;

-- AddForeignKey
ALTER TABLE [dbo].[Task] ADD CONSTRAINT [Task_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TaskAssignment] ADD CONSTRAINT [TaskAssignment_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Supplier] ADD CONSTRAINT [Supplier_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Tender] ADD CONSTRAINT [Tender_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TenderBid] ADD CONSTRAINT [TenderBid_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PurchaseOrder] ADD CONSTRAINT [PurchaseOrder_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Delivery] ADD CONSTRAINT [Delivery_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InventoryItem] ADD CONSTRAINT [InventoryItem_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ProjectStock] ADD CONSTRAINT [ProjectStock_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[GoodsReceipt] ADD CONSTRAINT [GoodsReceipt_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[GoodsReceiptItem] ADD CONSTRAINT [GoodsReceiptItem_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StockMovement] ADD CONSTRAINT [StockMovement_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MaterialConsumption] ADD CONSTRAINT [MaterialConsumption_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Contract] ADD CONSTRAINT [Contract_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ChangeOrder] ADD CONSTRAINT [ChangeOrder_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Invoice] ADD CONSTRAINT [Invoice_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Payment] ADD CONSTRAINT [Payment_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ControlReport] ADD CONSTRAINT [ControlReport_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkAcceptance] ADD CONSTRAINT [WorkAcceptance_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Incident] ADD CONSTRAINT [Incident_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Document] ADD CONSTRAINT [Document_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[DocumentExchange] ADD CONSTRAINT [DocumentExchange_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkflowDefinition] ADD CONSTRAINT [WorkflowDefinition_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[DailyLog] ADD CONSTRAINT [DailyLog_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Inspection] ADD CONSTRAINT [Inspection_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PunchItem] ADD CONSTRAINT [PunchItem_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Meeting] ADD CONSTRAINT [Meeting_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CostTransaction] ADD CONSTRAINT [CostTransaction_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WeeklyReport] ADD CONSTRAINT [WeeklyReport_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
