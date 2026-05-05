-- CreateTable DailyLogTaskProgress
CREATE TABLE [dbo].[DailyLogTaskProgress] (
    [id] INT NOT NULL IDENTITY(1,1),
    [daily_log_id] INT NOT NULL,
    [task_id] INT NOT NULL,
    [progress_percentage] INT,
    [comment] NVARCHAR(MAX),
    [photos_url] NVARCHAR(MAX),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [DF_DailyLogTaskProgress_created_at] DEFAULT GETDATE(),
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [DF_DailyLogTaskProgress_updated_at] DEFAULT GETDATE(),
    CONSTRAINT [PK_DailyLogTaskProgress] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_DailyLogTaskProgress_daily_log_id] ON [dbo].[DailyLogTaskProgress]([daily_log_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_DailyLogTaskProgress_task_id] ON [dbo].[DailyLogTaskProgress]([task_id]);

-- CreateIndex
CREATE UNIQUE NONCLUSTERED INDEX [IX_DailyLogTaskProgress_daily_log_id_task_id] ON [dbo].[DailyLogTaskProgress]([daily_log_id], [task_id]);

-- AddForeignKey
ALTER TABLE [dbo].[DailyLogTaskProgress] ADD CONSTRAINT [FK_DailyLogTaskProgress_daily_log_id] FOREIGN KEY ([daily_log_id]) REFERENCES [dbo].[DailyLog]([id]) ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[DailyLogTaskProgress] ADD CONSTRAINT [FK_DailyLogTaskProgress_task_id] FOREIGN KEY ([task_id]) REFERENCES [dbo].[Task]([id]) ON DELETE NO ACTION;
