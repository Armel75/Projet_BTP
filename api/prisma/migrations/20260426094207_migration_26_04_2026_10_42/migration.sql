/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[matricule]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `matricule` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `User` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[User] ADD [failedLogins] INT NOT NULL CONSTRAINT [User_failedLogins_df] DEFAULT 0,
[lastLoginAt] DATETIME2,
[matricule] NVARCHAR(1000) NOT NULL,
[phone] NVARCHAR(1000),
[status] NVARCHAR(1000) NOT NULL,
[username] NVARCHAR(1000) NOT NULL;

-- CreateIndex
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_username_key] UNIQUE NONCLUSTERED ([username]);

-- CreateIndex
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_matricule_key] UNIQUE NONCLUSTERED ([matricule]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
