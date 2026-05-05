-- Étape 1: Rendre task_id nullable (support des activités imprévues)
ALTER TABLE [dbo].[DailyLogTaskProgress] ALTER COLUMN [task_id] INT NULL;

-- Étape 2: Supprimer la contrainte unique sur (daily_log_id, task_id)
-- car task_id peut désormais être NULL et plusieurs activités imprévues sont autorisées
DROP INDEX [IX_DailyLogTaskProgress_daily_log_id_task_id] ON [dbo].[DailyLogTaskProgress];

-- Étape 3: Ajouter le champ type d'activité
ALTER TABLE [dbo].[DailyLogTaskProgress]
  ADD [task_type] NVARCHAR(20) NOT NULL CONSTRAINT [DF_DailyLogTaskProgress_task_type] DEFAULT 'planned';

-- Étape 4: Ajouter le titre libre pour les activités imprévues
ALTER TABLE [dbo].[DailyLogTaskProgress]
  ADD [task_title_custom] NVARCHAR(500) NULL;

-- Étape 5: Ajouter les données main d'oeuvre (JSON array)
ALTER TABLE [dbo].[DailyLogTaskProgress]
  ADD [labor_data] NVARCHAR(MAX) NULL;

-- Étape 6: Ajouter les données équipement (JSON array)
ALTER TABLE [dbo].[DailyLogTaskProgress]
  ADD [equipment_data] NVARCHAR(MAX) NULL;

-- Étape 7: Ajouter les données matériaux (JSON array)
ALTER TABLE [dbo].[DailyLogTaskProgress]
  ADD [material_data] NVARCHAR(MAX) NULL;
