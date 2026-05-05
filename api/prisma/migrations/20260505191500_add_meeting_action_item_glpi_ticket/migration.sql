ALTER TABLE [dbo].[MeetingActionItem]
  ADD [glpi_ticket_id] INT NULL;

CREATE NONCLUSTERED INDEX [MeetingActionItem_glpi_ticket_id_idx]
  ON [dbo].[MeetingActionItem]([glpi_ticket_id]);

ALTER TABLE [dbo].[MeetingActionItem]
  ADD CONSTRAINT [MeetingActionItem_glpi_ticket_id_fkey]
  FOREIGN KEY ([glpi_ticket_id]) REFERENCES [dbo].[Ticket]([id])
  ON DELETE NO ACTION ON UPDATE NO ACTION;
