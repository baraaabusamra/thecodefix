CREATE INDEX "content_lesson_track_idx" ON "content_lesson" USING btree ("track");--> statement-breakpoint
CREATE INDEX "instructor_status_idx" ON "instructor" USING btree ("status");--> statement-breakpoint
CREATE INDEX "outreach_contact_status_idx" ON "outreach_contact" USING btree ("status");--> statement-breakpoint
CREATE INDEX "suggestion_status_idx" ON "suggestion" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ticket_status_idx" ON "ticket" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ticket_assignee_id_idx" ON "ticket" USING btree ("assigneeId");--> statement-breakpoint
CREATE INDEX "work_report_user_id_idx" ON "work_report" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "work_report_status_idx" ON "work_report" USING btree ("status");