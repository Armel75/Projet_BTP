/*
  Warnings:

  - You are about to alter the column `amount` on the `Contract` table. The data in that column could be lost. The data in that column will be cast from `Float(53)` to `Decimal(15,2)`.
  - You are about to alter the column `quantity` on the `ContractLineItem` table. The data in that column could be lost. The data in that column will be cast from `Float(53)` to `Decimal(15,4)`.
  - You are about to alter the column `unit_price` on the `ContractLineItem` table. The data in that column could be lost. The data in that column will be cast from `Float(53)` to `Decimal(15,2)`.
  - You are about to alter the column `total_price` on the `ContractLineItem` table. The data in that column could be lost. The data in that column will be cast from `Float(53)` to `Decimal(15,2)`.
  - Added the required column `updated_at` to the `ContractLineItem` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable: drop default constraint before altering column type (SQL Server requirement)
ALTER TABLE [dbo].[Contract] DROP CONSTRAINT [Contract_amount_df];
ALTER TABLE [dbo].[Contract] ALTER COLUMN [amount] DECIMAL(15,2) NOT NULL;
ALTER TABLE [dbo].[Contract] ADD CONSTRAINT [Contract_amount_df] DEFAULT 0 FOR [amount];
ALTER TABLE [dbo].[Contract] ADD [advance_payment_amount] DECIMAL(15,2),
[advance_payment_pct] FLOAT(53),
[approved_at] DATETIME2,
[approved_by] INT,
[category] NVARCHAR(1000),
[description] NVARCHAR(max),
[document_url] NVARCHAR(1000),
[payment_terms] INT,
[price_revision_index] NVARCHAR(1000),
[terminated_at] DATETIME2,
[termination_reason] NVARCHAR(max);

-- AlterTable
ALTER TABLE [dbo].[ContractLineItem] ALTER COLUMN [quantity] DECIMAL(15,4) NOT NULL;
ALTER TABLE [dbo].[ContractLineItem] ALTER COLUMN [unit_price] DECIMAL(15,2) NOT NULL;
ALTER TABLE [dbo].[ContractLineItem] ALTER COLUMN [total_price] DECIMAL(15,2) NOT NULL;
ALTER TABLE [dbo].[ContractLineItem] ADD CONSTRAINT [ContractLineItem_quantity_df] DEFAULT 0 FOR [quantity], CONSTRAINT [ContractLineItem_total_price_df] DEFAULT 0 FOR [total_price], CONSTRAINT [ContractLineItem_unit_price_df] DEFAULT 0 FOR [unit_price];
ALTER TABLE [dbo].[ContractLineItem] ADD [billed_amount] DECIMAL(15,2) NOT NULL CONSTRAINT [ContractLineItem_billed_amount_df] DEFAULT 0,
[category] NVARCHAR(1000),
[created_at] DATETIME2 NOT NULL CONSTRAINT [ContractLineItem_created_at_df] DEFAULT CURRENT_TIMESTAMP,
[created_by] INT,
[lot_id] INT,
[order_index] INT NOT NULL CONSTRAINT [ContractLineItem_order_index_df] DEFAULT 0,
[progress_pct] FLOAT(53) NOT NULL CONSTRAINT [ContractLineItem_progress_pct_df] DEFAULT 0,
[updated_at] DATETIME2 NOT NULL CONSTRAINT [ContractLineItem_updated_at_df] DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE NONCLUSTERED INDEX [Contract_supplier_id_idx] ON [dbo].[Contract]([supplier_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ContractLineItem_contract_id_idx] ON [dbo].[ContractLineItem]([contract_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ContractLineItem_lot_id_idx] ON [dbo].[ContractLineItem]([lot_id]);

-- AddForeignKey
ALTER TABLE [dbo].[Contract] ADD CONSTRAINT [Contract_approved_by_fkey] FOREIGN KEY ([approved_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ContractLineItem] ADD CONSTRAINT [ContractLineItem_lot_id_fkey] FOREIGN KEY ([lot_id]) REFERENCES [dbo].[ProjectLot]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ContractLineItem] ADD CONSTRAINT [ContractLineItem_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
