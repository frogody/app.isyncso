-- ============================================================================
-- OPTIMIZE RLS PERFORMANCE
-- Fixes 1700+ Supabase Performance Advisor warnings about auth.uid() calls
-- ============================================================================

-- Create optimized auth helper functions (STABLE + SECURITY DEFINER for caching)
CREATE OR REPLACE FUNCTION public.auth_uid()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT auth.uid() $$;

CREATE OR REPLACE FUNCTION public.auth_company_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT company_id FROM public.users WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.user_in_company(check_company_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND company_id = check_company_id) $$;

CREATE OR REPLACE FUNCTION public.auth_hierarchy_level()
RETURNS INTEGER LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE(MAX(r.hierarchy_level), 0) FROM public.rbac_user_roles ur JOIN public.rbac_roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() $$;

GRANT EXECUTE ON FUNCTION public.auth_uid() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_in_company(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_hierarchy_level() TO authenticated;

-- Auto-generated RLS policy updates
-- Replacing auth.uid() with public.auth_uid() for query optimization

DROP POLICY IF EXISTS "Admins can manage achievements" ON public."achievements";
CREATE POLICY "Admins can manage achievements" ON public."achievements" AS PERMISSIVE FOR ALL TO public USING (is_admin(( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can view their org action logs" ON public."action_logs";
CREATE POLICY "Users can view their org action logs" ON public."action_logs" AS PERMISSIVE FOR SELECT TO public USING (((organization_id = get_user_organization_id()) OR (user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid())))));

DROP POLICY IF EXISTS "Users can delete their own activities" ON public."activities";
CREATE POLICY "Users can delete their own activities" ON public."activities" AS PERMISSIVE FOR DELETE TO public USING ((((public.auth_uid())::text = (user_id)::text) OR (public.auth_uid() = ( SELECT users.auth_id
   FROM users
  WHERE (users.id = activities.user_id)))));

DROP POLICY IF EXISTS "Users can insert their own activities" ON public."activities";
CREATE POLICY "Users can insert their own activities" ON public."activities" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((((public.auth_uid())::text = (user_id)::text) OR (public.auth_uid() = ( SELECT users.auth_id
   FROM users
  WHERE (users.id = activities.user_id)))));

DROP POLICY IF EXISTS "Users can update their own activities" ON public."activities";
CREATE POLICY "Users can update their own activities" ON public."activities" AS PERMISSIVE FOR UPDATE TO public USING ((((public.auth_uid())::text = (user_id)::text) OR (public.auth_uid() = ( SELECT users.auth_id
   FROM users
  WHERE (users.id = activities.user_id)))));

DROP POLICY IF EXISTS "Users can view their own activities" ON public."activities";
CREATE POLICY "Users can view their own activities" ON public."activities" AS PERMISSIVE FOR SELECT TO public USING ((((public.auth_uid())::text = (user_id)::text) OR (public.auth_uid() = ( SELECT users.auth_id
   FROM users
  WHERE (users.id = activities.user_id)))));

DROP POLICY IF EXISTS "Users can manage their sessions" ON public."activity_sessions";
CREATE POLICY "Users can manage their sessions" ON public."activity_sessions" AS PERMISSIVE FOR ALL TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can view their sessions" ON public."activity_sessions";
CREATE POLICY "Users can view their sessions" ON public."activity_sessions" AS PERMISSIVE FOR SELECT TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can insert their own summaries" ON public."activity_summaries";
CREATE POLICY "Users can insert their own summaries" ON public."activity_summaries" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((public.auth_uid() = ( SELECT users.auth_id
   FROM users
  WHERE (users.id = activity_summaries.user_id))));

DROP POLICY IF EXISTS "Users can view their own summaries" ON public."activity_summaries";
CREATE POLICY "Users can view their own summaries" ON public."activity_summaries" AS PERMISSIVE FOR SELECT TO public USING ((public.auth_uid() = ( SELECT users.auth_id
   FROM users
  WHERE (users.id = activity_summaries.user_id))));

DROP POLICY IF EXISTS "Admins manage AI limits" ON public."ai_usage_limits";
CREATE POLICY "Admins manage AI limits" ON public."ai_usage_limits" AS PERMISSIVE FOR ALL TO public USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users view company AI limits" ON public."ai_usage_limits";
CREATE POLICY "Users view company AI limits" ON public."ai_usage_limits" AS PERMISSIVE FOR SELECT TO public USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users view company AI usage" ON public."ai_usage_log";
CREATE POLICY "Users view company AI usage" ON public."ai_usage_log" AS PERMISSIVE FOR SELECT TO public USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = public.auth_uid()))));

DROP POLICY IF EXISTS "Admins can manage app settings" ON public."app_settings";
CREATE POLICY "Admins can manage app settings" ON public."app_settings" AS PERMISSIVE FOR ALL TO public USING (is_admin(( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users manage company brand assets" ON public."brand_assets";
CREATE POLICY "Users manage company brand assets" ON public."brand_assets" AS PERMISSIVE FOR ALL TO public USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can update their own chapter visibility" ON public."buddy_book_chapters";
CREATE POLICY "Users can update their own chapter visibility" ON public."buddy_book_chapters" AS PERMISSIVE FOR UPDATE TO public USING ((user_id = public.auth_uid())) WITH CHECK ((user_id = public.auth_uid()));

DROP POLICY IF EXISTS "Users can view their own buddy book chapters" ON public."buddy_book_chapters";
CREATE POLICY "Users can view their own buddy book chapters" ON public."buddy_book_chapters" AS PERMISSIVE FOR SELECT TO public USING ((user_id = public.auth_uid()));

DROP POLICY IF EXISTS "Users can delete their own feedback" ON public."buddy_book_feedback";
CREATE POLICY "Users can delete their own feedback" ON public."buddy_book_feedback" AS PERMISSIVE FOR DELETE TO public USING ((user_id = public.auth_uid()));

DROP POLICY IF EXISTS "Users can insert their own feedback" ON public."buddy_book_feedback";
CREATE POLICY "Users can insert their own feedback" ON public."buddy_book_feedback" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((user_id = public.auth_uid()));

DROP POLICY IF EXISTS "Users can update their own feedback" ON public."buddy_book_feedback";
CREATE POLICY "Users can update their own feedback" ON public."buddy_book_feedback" AS PERMISSIVE FOR UPDATE TO public USING ((user_id = public.auth_uid())) WITH CHECK ((user_id = public.auth_uid()));

DROP POLICY IF EXISTS "Users can view their own feedback" ON public."buddy_book_feedback";
CREATE POLICY "Users can view their own feedback" ON public."buddy_book_feedback" AS PERMISSIVE FOR SELECT TO public USING ((user_id = public.auth_uid()));

DROP POLICY IF EXISTS "Users can view their certificates" ON public."certificates";
CREATE POLICY "Users can view their certificates" ON public."certificates" AS PERMISSIVE FOR SELECT TO public USING (((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))) OR (organization_id = get_user_organization_id())));

DROP POLICY IF EXISTS "channels_delete" ON public."channels";
CREATE POLICY "channels_delete" ON public."channels" AS PERMISSIVE FOR DELETE TO authenticated USING ((user_id = public.auth_uid()));

DROP POLICY IF EXISTS "channels_select" ON public."channels";
CREATE POLICY "channels_select" ON public."channels" AS PERMISSIVE FOR SELECT TO authenticated USING (((type = 'public'::text) OR (type IS NULL) OR (user_id = public.auth_uid()) OR (public.auth_uid() = ANY (members))));

DROP POLICY IF EXISTS "channels_update" ON public."channels";
CREATE POLICY "channels_update" ON public."channels" AS PERMISSIVE FOR UPDATE TO authenticated USING (((user_id = public.auth_uid()) OR (public.auth_uid() = ANY (members)))) WITH CHECK (((user_id = public.auth_uid()) OR (public.auth_uid() = ANY (members))));

DROP POLICY IF EXISTS "Users can create their own conversations" ON public."chat_conversations";
CREATE POLICY "Users can create their own conversations" ON public."chat_conversations" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can delete their own conversations" ON public."chat_conversations";
CREATE POLICY "Users can delete their own conversations" ON public."chat_conversations" AS PERMISSIVE FOR DELETE TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can update their own conversations" ON public."chat_conversations";
CREATE POLICY "Users can update their own conversations" ON public."chat_conversations" AS PERMISSIVE FOR UPDATE TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can view their own conversations" ON public."chat_conversations";
CREATE POLICY "Users can view their own conversations" ON public."chat_conversations" AS PERMISSIVE FOR SELECT TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can create their chat progress" ON public."chat_progress";
CREATE POLICY "Users can create their chat progress" ON public."chat_progress" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can update their chat progress" ON public."chat_progress";
CREATE POLICY "Users can update their chat progress" ON public."chat_progress" AS PERMISSIVE FOR UPDATE TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can view their chat progress" ON public."chat_progress";
CREATE POLICY "Users can view their chat progress" ON public."chat_progress" AS PERMISSIVE FOR SELECT TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can update their company data" ON public."company_data_cache";
CREATE POLICY "Users can update their company data" ON public."company_data_cache" AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.company_data_id = company_data_cache.id) AND (users.auth_id = public.auth_uid())))));

DROP POLICY IF EXISTS "Users can manage their own company roles" ON public."company_user_roles";
CREATE POLICY "Users can manage their own company roles" ON public."company_user_roles" AS PERMISSIVE FOR ALL TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can read their own company roles" ON public."company_user_roles";
CREATE POLICY "Users can read their own company roles" ON public."company_user_roles" AS PERMISSIVE FOR SELECT TO public USING (((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))) OR (company_data_id IN ( SELECT users.company_data_id
   FROM users
  WHERE (users.auth_id = public.auth_uid())))));

DROP POLICY IF EXISTS "Admins can manage compliance requirements" ON public."compliance_requirements";
CREATE POLICY "Admins can manage compliance requirements" ON public."compliance_requirements" AS PERMISSIVE FOR ALL TO public USING (is_admin(( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Course authors can manage their courses" ON public."course_catalog";
CREATE POLICY "Course authors can manage their courses" ON public."course_catalog" AS PERMISSIVE FOR ALL TO public USING ((author_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Admins can manage course content" ON public."course_content";
CREATE POLICY "Admins can manage course content" ON public."course_content" AS PERMISSIVE FOR ALL TO public USING (is_admin(( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can create their own enrollments" ON public."course_enrollments";
CREATE POLICY "Users can create their own enrollments" ON public."course_enrollments" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can update their own enrollments" ON public."course_enrollments";
CREATE POLICY "Users can update their own enrollments" ON public."course_enrollments" AS PERMISSIVE FOR UPDATE TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can view their own enrollments" ON public."course_enrollments";
CREATE POLICY "Users can view their own enrollments" ON public."course_enrollments" AS PERMISSIVE FOR SELECT TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Admins can manage prerequisites" ON public."course_prerequisites";
CREATE POLICY "Admins can manage prerequisites" ON public."course_prerequisites" AS PERMISSIVE FOR ALL TO public USING (is_admin(( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can manage their own progress" ON public."course_progress";
CREATE POLICY "Users can manage their own progress" ON public."course_progress" AS PERMISSIVE FOR ALL TO public USING ((enrollment_id IN ( SELECT course_enrollments.id
   FROM course_enrollments
  WHERE (course_enrollments.user_id IN ( SELECT users.id
           FROM users
          WHERE (users.auth_id = public.auth_uid()))))));

DROP POLICY IF EXISTS "Users can manage their recommendations" ON public."course_recommendations";
CREATE POLICY "Users can manage their recommendations" ON public."course_recommendations" AS PERMISSIVE FOR ALL TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can view their recommendations" ON public."course_recommendations";
CREATE POLICY "Users can view their recommendations" ON public."course_recommendations" AS PERMISSIVE FOR SELECT TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can manage their own reviews" ON public."course_reviews";
CREATE POLICY "Users can manage their own reviews" ON public."course_reviews" AS PERMISSIVE FOR ALL TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Admins can manage course skills" ON public."course_skills";
CREATE POLICY "Admins can manage course skills" ON public."course_skills" AS PERMISSIVE FOR ALL TO public USING (is_admin(( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can insert their own deep content" ON public."deep_content";
CREATE POLICY "Users can insert their own deep content" ON public."deep_content" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM activities a
  WHERE ((a.id = deep_content.activity_id) AND (((public.auth_uid())::text = (a.user_id)::text) OR (public.auth_uid() = ( SELECT users.auth_id
           FROM users
          WHERE (users.id = a.user_id))))))));

DROP POLICY IF EXISTS "Users can view their own deep content" ON public."deep_content";
CREATE POLICY "Users can view their own deep content" ON public."deep_content" AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM activities a
  WHERE ((a.id = deep_content.activity_id) AND (((public.auth_uid())::text = (a.user_id)::text) OR (public.auth_uid() = ( SELECT users.auth_id
           FROM users
          WHERE (users.id = a.user_id))))))));

DROP POLICY IF EXISTS "Users can manage digital products for their company" ON public."digital_products";
CREATE POLICY "Users can manage digital products for their company" ON public."digital_products" AS PERMISSIVE FOR ALL TO public USING ((product_id IN ( SELECT products.id
   FROM products
  WHERE (products.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.id = public.auth_uid())))))) WITH CHECK ((product_id IN ( SELECT products.id
   FROM products
  WHERE (products.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.id = public.auth_uid()))))));

DROP POLICY IF EXISTS "Users can delete expense line items for their expenses" ON public."expense_line_items";
CREATE POLICY "Users can delete expense line items for their expenses" ON public."expense_line_items" AS PERMISSIVE FOR DELETE TO public USING ((expense_id IN ( SELECT expenses.id
   FROM expenses
  WHERE (expenses.user_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can insert expense line items for their expenses" ON public."expense_line_items";
CREATE POLICY "Users can insert expense line items for their expenses" ON public."expense_line_items" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((expense_id IN ( SELECT expenses.id
   FROM expenses
  WHERE (expenses.user_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can update expense line items for their expenses" ON public."expense_line_items";
CREATE POLICY "Users can update expense line items for their expenses" ON public."expense_line_items" AS PERMISSIVE FOR UPDATE TO public USING ((expense_id IN ( SELECT expenses.id
   FROM expenses
  WHERE (expenses.user_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can view expense line items for their expenses" ON public."expense_line_items";
CREATE POLICY "Users can view expense line items for their expenses" ON public."expense_line_items" AS PERMISSIVE FOR SELECT TO public USING ((expense_id IN ( SELECT expenses.id
   FROM expenses
  WHERE (expenses.user_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can delete own expenses" ON public."expenses";
CREATE POLICY "Users can delete own expenses" ON public."expenses" AS PERMISSIVE FOR DELETE TO authenticated USING ((public.auth_uid() = user_id));

DROP POLICY IF EXISTS "Users can insert own expenses" ON public."expenses";
CREATE POLICY "Users can insert own expenses" ON public."expenses" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((public.auth_uid() = user_id));

DROP POLICY IF EXISTS "Users can update own expenses" ON public."expenses";
CREATE POLICY "Users can update own expenses" ON public."expenses" AS PERMISSIVE FOR UPDATE TO authenticated USING ((public.auth_uid() = user_id)) WITH CHECK ((public.auth_uid() = user_id));

DROP POLICY IF EXISTS "Users can view own expenses" ON public."expenses";
CREATE POLICY "Users can view own expenses" ON public."expenses" AS PERMISSIVE FOR SELECT TO authenticated USING ((public.auth_uid() = user_id));

DROP POLICY IF EXISTS "Admins can manage feature requests" ON public."feature_requests";
CREATE POLICY "Admins can manage feature requests" ON public."feature_requests" AS PERMISSIVE FOR ALL TO public USING (is_admin(( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users manage company content" ON public."generated_content";
CREATE POLICY "Users manage company content" ON public."generated_content" AS PERMISSIVE FOR ALL TO public USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = public.auth_uid()))));

DROP POLICY IF EXISTS "Admins can manage help articles" ON public."help_articles";
CREATE POLICY "Admins can manage help articles" ON public."help_articles" AS PERMISSIVE FOR ALL TO public USING (is_admin(( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Admins can manage ICP templates" ON public."icp_templates";
CREATE POLICY "Admins can manage ICP templates" ON public."icp_templates" AS PERMISSIVE FOR ALL TO public USING (is_admin(( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can manage their invoice items" ON public."invoice_line_items";
CREATE POLICY "Users can manage their invoice items" ON public."invoice_line_items" AS PERMISSIVE FOR ALL TO public USING ((invoice_id IN ( SELECT invoices.id
   FROM invoices
  WHERE (invoices.user_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can view their invoice items" ON public."invoice_line_items";
CREATE POLICY "Users can view their invoice items" ON public."invoice_line_items" AS PERMISSIVE FOR SELECT TO public USING ((invoice_id IN ( SELECT invoices.id
   FROM invoices
  WHERE (invoices.user_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can delete own invoices" ON public."invoices";
CREATE POLICY "Users can delete own invoices" ON public."invoices" AS PERMISSIVE FOR DELETE TO authenticated USING ((public.auth_uid() = user_id));

DROP POLICY IF EXISTS "Users can insert own invoices" ON public."invoices";
CREATE POLICY "Users can insert own invoices" ON public."invoices" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((public.auth_uid() = user_id));

DROP POLICY IF EXISTS "Users can update own invoices" ON public."invoices";
CREATE POLICY "Users can update own invoices" ON public."invoices" AS PERMISSIVE FOR UPDATE TO authenticated USING ((public.auth_uid() = user_id)) WITH CHECK ((public.auth_uid() = user_id));

DROP POLICY IF EXISTS "Users can view own invoices" ON public."invoices";
CREATE POLICY "Users can view own invoices" ON public."invoices" AS PERMISSIVE FOR SELECT TO authenticated USING ((public.auth_uid() = user_id));

DROP POLICY IF EXISTS "Users can manage their learning goals" ON public."learning_goals";
CREATE POLICY "Users can manage their learning goals" ON public."learning_goals" AS PERMISSIVE FOR ALL TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can view their learning goals" ON public."learning_goals";
CREATE POLICY "Users can view their learning goals" ON public."learning_goals" AS PERMISSIVE FOR SELECT TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Admins can manage" ON public."learning_path_courses";
CREATE POLICY "Admins can manage" ON public."learning_path_courses" AS PERMISSIVE FOR ALL TO public USING (is_admin(( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can manage their learning paths" ON public."learning_paths";
CREATE POLICY "Users can manage their learning paths" ON public."learning_paths" AS PERMISSIVE FOR ALL TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can view their learning paths" ON public."learning_paths";
CREATE POLICY "Users can view their learning paths" ON public."learning_paths" AS PERMISSIVE FOR SELECT TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can insert their own learning progress" ON public."learning_progress";
CREATE POLICY "Users can insert their own learning progress" ON public."learning_progress" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((public.auth_uid() = ( SELECT users.auth_id
   FROM users
  WHERE (users.id = learning_progress.user_id))));

DROP POLICY IF EXISTS "Users can update their own learning progress" ON public."learning_progress";
CREATE POLICY "Users can update their own learning progress" ON public."learning_progress" AS PERMISSIVE FOR UPDATE TO public USING ((public.auth_uid() = ( SELECT users.auth_id
   FROM users
  WHERE (users.id = learning_progress.user_id))));

DROP POLICY IF EXISTS "Users can view their own learning progress" ON public."learning_progress";
CREATE POLICY "Users can view their own learning progress" ON public."learning_progress" AS PERMISSIVE FOR SELECT TO public USING ((public.auth_uid() = ( SELECT users.auth_id
   FROM users
  WHERE (users.id = learning_progress.user_id))));

DROP POLICY IF EXISTS "Users can manage their learning sessions" ON public."learning_sessions";
CREATE POLICY "Users can manage their learning sessions" ON public."learning_sessions" AS PERMISSIVE FOR ALL TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can view their learning sessions" ON public."learning_sessions";
CREATE POLICY "Users can view their learning sessions" ON public."learning_sessions" AS PERMISSIVE FOR SELECT TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can manage their learning stats" ON public."learning_stats";
CREATE POLICY "Users can manage their learning stats" ON public."learning_stats" AS PERMISSIVE FOR ALL TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can view their learning stats" ON public."learning_stats";
CREATE POLICY "Users can view their learning stats" ON public."learning_stats" AS PERMISSIVE FOR SELECT TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "messages_delete" ON public."messages";
CREATE POLICY "messages_delete" ON public."messages" AS PERMISSIVE FOR DELETE TO authenticated USING ((sender_id = public.auth_uid()));

DROP POLICY IF EXISTS "messages_insert" ON public."messages";
CREATE POLICY "messages_insert" ON public."messages" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((sender_id = public.auth_uid()) AND (EXISTS ( SELECT 1
   FROM channels c
  WHERE ((c.id = messages.channel_id) AND ((c.type = 'public'::text) OR (c.type IS NULL) OR (c.user_id = public.auth_uid()) OR (public.auth_uid() = ANY (c.members))))))));

DROP POLICY IF EXISTS "messages_select" ON public."messages";
CREATE POLICY "messages_select" ON public."messages" AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM channels c
  WHERE ((c.id = messages.channel_id) AND ((c.type = 'public'::text) OR (c.type IS NULL) OR (c.user_id = public.auth_uid()) OR (public.auth_uid() = ANY (c.members)))))));

DROP POLICY IF EXISTS "messages_update" ON public."messages";
CREATE POLICY "messages_update" ON public."messages" AS PERMISSIVE FOR UPDATE TO authenticated USING ((sender_id = public.auth_uid())) WITH CHECK ((sender_id = public.auth_uid()));

DROP POLICY IF EXISTS "Users can insert their own lessons" ON public."micro_lessons";
CREATE POLICY "Users can insert their own lessons" ON public."micro_lessons" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((public.auth_uid() = ( SELECT users.auth_id
   FROM users
  WHERE (users.id = micro_lessons.user_id))));

DROP POLICY IF EXISTS "Users can update their own lessons" ON public."micro_lessons";
CREATE POLICY "Users can update their own lessons" ON public."micro_lessons" AS PERMISSIVE FOR UPDATE TO public USING ((public.auth_uid() = ( SELECT users.auth_id
   FROM users
  WHERE (users.id = micro_lessons.user_id))));

DROP POLICY IF EXISTS "Users can view their own lessons" ON public."micro_lessons";
CREATE POLICY "Users can view their own lessons" ON public."micro_lessons" AS PERMISSIVE FOR SELECT TO public USING ((public.auth_uid() = ( SELECT users.auth_id
   FROM users
  WHERE (users.id = micro_lessons.user_id))));

DROP POLICY IF EXISTS "Users can insert their own missing actions" ON public."missing_actions";
CREATE POLICY "Users can insert their own missing actions" ON public."missing_actions" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((public.auth_uid() = ( SELECT users.auth_id
   FROM users
  WHERE (users.id = missing_actions.user_id))));

DROP POLICY IF EXISTS "Users can update their own missing actions" ON public."missing_actions";
CREATE POLICY "Users can update their own missing actions" ON public."missing_actions" AS PERMISSIVE FOR UPDATE TO public USING ((public.auth_uid() = ( SELECT users.auth_id
   FROM users
  WHERE (users.id = missing_actions.user_id))));

DROP POLICY IF EXISTS "Users can view their own missing actions" ON public."missing_actions";
CREATE POLICY "Users can view their own missing actions" ON public."missing_actions" AS PERMISSIVE FOR SELECT TO public USING ((public.auth_uid() = ( SELECT users.auth_id
   FROM users
  WHERE (users.id = missing_actions.user_id))));

DROP POLICY IF EXISTS "Admins can manage modules" ON public."modules";
CREATE POLICY "Admins can manage modules" ON public."modules" AS PERMISSIVE FOR ALL TO public USING (is_admin(( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can manage physical products for their company" ON public."physical_products";
CREATE POLICY "Users can manage physical products for their company" ON public."physical_products" AS PERMISSIVE FOR ALL TO public USING ((product_id IN ( SELECT products.id
   FROM products
  WHERE (products.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.id = public.auth_uid())))))) WITH CHECK ((product_id IN ( SELECT products.id
   FROM products
  WHERE (products.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.id = public.auth_uid()))))));

DROP POLICY IF EXISTS "Users can manage categories for their company" ON public."product_categories";
CREATE POLICY "Users can manage categories for their company" ON public."product_categories" AS PERMISSIVE FOR ALL TO public USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = public.auth_uid())))) WITH CHECK ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can manage research queue for their company" ON public."product_research_queue";
CREATE POLICY "Users can manage research queue for their company" ON public."product_research_queue" AS PERMISSIVE FOR ALL TO public USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can view research queue for their company" ON public."product_research_queue";
CREATE POLICY "Users can view research queue for their company" ON public."product_research_queue" AS PERMISSIVE FOR SELECT TO public USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can manage product suppliers for their company" ON public."product_suppliers";
CREATE POLICY "Users can manage product suppliers for their company" ON public."product_suppliers" AS PERMISSIVE FOR ALL TO public USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = public.auth_uid())))) WITH CHECK ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can manage products for their company" ON public."products";
CREATE POLICY "Users can manage products for their company" ON public."products" AS PERMISSIVE FOR ALL TO public USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = public.auth_uid())))) WITH CHECK ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can create company proposals" ON public."proposals";
CREATE POLICY "Users can create company proposals" ON public."proposals" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can delete company proposals" ON public."proposals";
CREATE POLICY "Users can delete company proposals" ON public."proposals" AS PERMISSIVE FOR DELETE TO public USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can update company proposals" ON public."proposals";
CREATE POLICY "Users can update company proposals" ON public."proposals" AS PERMISSIVE FOR UPDATE TO public USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can view company proposals" ON public."proposals";
CREATE POLICY "Users can view company proposals" ON public."proposals" AS PERMISSIVE FOR SELECT TO public USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can manage their investment criteria" ON public."raise_investment_criteria";
CREATE POLICY "Users can manage their investment criteria" ON public."raise_investment_criteria" AS PERMISSIVE FOR ALL TO public USING ((investor_id IN ( SELECT raise_investors.id
   FROM raise_investors
  WHERE (raise_investors.user_id IN ( SELECT users.id
           FROM users
          WHERE (users.auth_id = public.auth_uid()))))));

DROP POLICY IF EXISTS "Users can view their investment criteria" ON public."raise_investment_criteria";
CREATE POLICY "Users can view their investment criteria" ON public."raise_investment_criteria" AS PERMISSIVE FOR SELECT TO public USING ((investor_id IN ( SELECT raise_investors.id
   FROM raise_investors
  WHERE ((raise_investors.user_id IN ( SELECT users.id
           FROM users
          WHERE (users.auth_id = public.auth_uid()))) OR (raise_investors.organization_id = get_user_organization_id())))));

DROP POLICY IF EXISTS "Users can view their org investors" ON public."raise_investors";
CREATE POLICY "Users can view their org investors" ON public."raise_investors" AS PERMISSIVE FOR SELECT TO public USING (((organization_id = get_user_organization_id()) OR (user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid())))));

DROP POLICY IF EXISTS "Users can manage their watchlists" ON public."raise_watchlists";
CREATE POLICY "Users can manage their watchlists" ON public."raise_watchlists" AS PERMISSIVE FOR ALL TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can view their watchlists" ON public."raise_watchlists";
CREATE POLICY "Users can view their watchlists" ON public."raise_watchlists" AS PERMISSIVE FOR SELECT TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "rbac_role_permissions_all" ON public."rbac_role_permissions";
CREATE POLICY "rbac_role_permissions_all" ON public."rbac_role_permissions" AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM (rbac_user_roles ur
     JOIN rbac_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = public.auth_uid()) AND (r.hierarchy_level >= 80)))));

DROP POLICY IF EXISTS "rbac_roles_insert" ON public."rbac_roles";
CREATE POLICY "rbac_roles_insert" ON public."rbac_roles" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM (rbac_user_roles ur
     JOIN rbac_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = public.auth_uid()) AND (r.hierarchy_level >= 80)))));

DROP POLICY IF EXISTS "rbac_user_roles_select" ON public."rbac_user_roles";
CREATE POLICY "rbac_user_roles_select" ON public."rbac_user_roles" AS PERMISSIVE FOR SELECT TO public USING (((user_id = public.auth_uid()) OR (get_my_hierarchy_level() >= 60)));

DROP POLICY IF EXISTS "Admins can manage skills" ON public."skills";
CREATE POLICY "Admins can manage skills" ON public."skills" AS PERMISSIVE FOR ALL TO public USING (is_admin(( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Admins can manage skills master" ON public."skills_master";
CREATE POLICY "Admins can manage skills master" ON public."skills_master" AS PERMISSIVE FOR ALL TO public USING (is_admin(( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can manage stock purchases for their company" ON public."stock_inventory_entries";
CREATE POLICY "Users can manage stock purchases for their company" ON public."stock_inventory_entries" AS PERMISSIVE FOR ALL TO public USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = public.auth_uid())))) WITH CHECK ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can access company line items" ON public."stock_purchase_line_items";
CREATE POLICY "Users can access company line items" ON public."stock_purchase_line_items" AS PERMISSIVE FOR ALL TO public USING ((stock_purchase_id IN ( SELECT stock_purchases.id
   FROM stock_purchases
  WHERE (stock_purchases.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.id = public.auth_uid()))))));

DROP POLICY IF EXISTS "Users can access company stock purchases" ON public."stock_purchases";
CREATE POLICY "Users can access company stock purchases" ON public."stock_purchases" AS PERMISSIVE FOR ALL TO public USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public."subscriptions";
CREATE POLICY "Users can delete own subscriptions" ON public."subscriptions" AS PERMISSIVE FOR DELETE TO authenticated USING ((public.auth_uid() = user_id));

DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public."subscriptions";
CREATE POLICY "Users can insert own subscriptions" ON public."subscriptions" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((public.auth_uid() = user_id));

DROP POLICY IF EXISTS "Users can update own subscriptions" ON public."subscriptions";
CREATE POLICY "Users can update own subscriptions" ON public."subscriptions" AS PERMISSIVE FOR UPDATE TO authenticated USING ((public.auth_uid() = user_id)) WITH CHECK ((public.auth_uid() = user_id));

DROP POLICY IF EXISTS "Users can view own subscriptions" ON public."subscriptions";
CREATE POLICY "Users can view own subscriptions" ON public."subscriptions" AS PERMISSIVE FOR SELECT TO authenticated USING ((public.auth_uid() = user_id));

DROP POLICY IF EXISTS "Users can manage supplier research queue" ON public."supplier_research_queue";
CREATE POLICY "Users can manage supplier research queue" ON public."supplier_research_queue" AS PERMISSIVE FOR ALL TO public USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can manage suppliers for their company" ON public."suppliers";
CREATE POLICY "Users can manage suppliers for their company" ON public."suppliers" AS PERMISSIVE FOR ALL TO public USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = public.auth_uid())))) WITH CHECK ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can manage their own tickets" ON public."support_tickets";
CREATE POLICY "Users can manage their own tickets" ON public."support_tickets" AS PERMISSIVE FOR ALL TO public USING (((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))) OR (organization_id = get_user_organization_id())));

DROP POLICY IF EXISTS "Users can view their org support tickets" ON public."support_tickets";
CREATE POLICY "Users can view their org support tickets" ON public."support_tickets" AS PERMISSIVE FOR SELECT TO public USING (((organization_id = get_user_organization_id()) OR (user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid())))));

DROP POLICY IF EXISTS "Users can access org tasks" ON public."tasks";
CREATE POLICY "Users can access org tasks" ON public."tasks" AS PERMISSIVE FOR ALL TO public USING ((organization_id IN ( SELECT users.organization_id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can update their tasks" ON public."tasks";
CREATE POLICY "Users can update their tasks" ON public."tasks" AS PERMISSIVE FOR UPDATE TO public USING (((assigned_to IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))) OR (organization_id = get_user_organization_id())));

DROP POLICY IF EXISTS "Users can view their tasks" ON public."tasks";
CREATE POLICY "Users can view their tasks" ON public."tasks" AS PERMISSIVE FOR SELECT TO public USING (((assigned_to IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))) OR (organization_id = get_user_organization_id())));

DROP POLICY IF EXISTS "Admins can delete team app access" ON public."team_app_access";
CREATE POLICY "Admins can delete team app access" ON public."team_app_access" AS PERMISSIVE FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM (rbac_user_roles ur
     JOIN rbac_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = public.auth_uid()) AND (r.hierarchy_level >= 80)))));

DROP POLICY IF EXISTS "Admins can insert team app access" ON public."team_app_access";
CREATE POLICY "Admins can insert team app access" ON public."team_app_access" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM (rbac_user_roles ur
     JOIN rbac_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = public.auth_uid()) AND (r.hierarchy_level >= 80)))));

DROP POLICY IF EXISTS "Admins can update team app access" ON public."team_app_access";
CREATE POLICY "Admins can update team app access" ON public."team_app_access" AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM (rbac_user_roles ur
     JOIN rbac_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = public.auth_uid()) AND (r.hierarchy_level >= 80)))));

DROP POLICY IF EXISTS "Admins can delete team members" ON public."team_members";
CREATE POLICY "Admins can delete team members" ON public."team_members" AS PERMISSIVE FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM (rbac_user_roles ur
     JOIN rbac_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = public.auth_uid()) AND (r.hierarchy_level >= 80)))));

DROP POLICY IF EXISTS "Admins can manage team members" ON public."team_members";
CREATE POLICY "Admins can manage team members" ON public."team_members" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM (rbac_user_roles ur
     JOIN rbac_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = public.auth_uid()) AND (r.hierarchy_level >= 80)))));

DROP POLICY IF EXISTS "Admins can update team members" ON public."team_members";
CREATE POLICY "Admins can update team members" ON public."team_members" AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM (rbac_user_roles ur
     JOIN rbac_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = public.auth_uid()) AND (r.hierarchy_level >= 80)))));

DROP POLICY IF EXISTS "Admins can delete teams" ON public."teams";
CREATE POLICY "Admins can delete teams" ON public."teams" AS PERMISSIVE FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM (rbac_user_roles ur
     JOIN rbac_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = public.auth_uid()) AND (r.hierarchy_level >= 80)))));

DROP POLICY IF EXISTS "Admins can insert teams" ON public."teams";
CREATE POLICY "Admins can insert teams" ON public."teams" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM (rbac_user_roles ur
     JOIN rbac_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = public.auth_uid()) AND (r.hierarchy_level >= 80)))));

DROP POLICY IF EXISTS "Admins can update teams" ON public."teams";
CREATE POLICY "Admins can update teams" ON public."teams" AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM (rbac_user_roles ur
     JOIN rbac_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = public.auth_uid()) AND (r.hierarchy_level >= 80)))));

DROP POLICY IF EXISTS "Users can manage their time entries" ON public."time_entries";
CREATE POLICY "Users can manage their time entries" ON public."time_entries" AS PERMISSIVE FOR ALL TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can view their time entries" ON public."time_entries";
CREATE POLICY "Users can view their time entries" ON public."time_entries" AS PERMISSIVE FOR SELECT TO public USING (((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))) OR (organization_id = get_user_organization_id())));

DROP POLICY IF EXISTS "Users can delete own config" ON public."user_app_configs";
CREATE POLICY "Users can delete own config" ON public."user_app_configs" AS PERMISSIVE FOR DELETE TO authenticated USING ((public.auth_uid() = user_id));

DROP POLICY IF EXISTS "Users can insert own config" ON public."user_app_configs";
CREATE POLICY "Users can insert own config" ON public."user_app_configs" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((public.auth_uid() = user_id));

DROP POLICY IF EXISTS "Users can update own config" ON public."user_app_configs";
CREATE POLICY "Users can update own config" ON public."user_app_configs" AS PERMISSIVE FOR UPDATE TO authenticated USING ((public.auth_uid() = user_id)) WITH CHECK ((public.auth_uid() = user_id));

DROP POLICY IF EXISTS "Users can view own config" ON public."user_app_configs";
CREATE POLICY "Users can view own config" ON public."user_app_configs" AS PERMISSIVE FOR SELECT TO authenticated USING ((public.auth_uid() = user_id));

DROP POLICY IF EXISTS "Users can manage their courses" ON public."user_courses";
CREATE POLICY "Users can manage their courses" ON public."user_courses" AS PERMISSIVE FOR ALL TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can view their courses" ON public."user_courses";
CREATE POLICY "Users can view their courses" ON public."user_courses" AS PERMISSIVE FOR SELECT TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Admins can manage" ON public."user_generated_courses";
CREATE POLICY "Admins can manage" ON public."user_generated_courses" AS PERMISSIVE FOR ALL TO public USING (is_admin(( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can insert their own profile" ON public."user_profiles";
CREATE POLICY "Users can insert their own profile" ON public."user_profiles" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((public.auth_uid() = ( SELECT users.auth_id
   FROM users
  WHERE (users.id = user_profiles.user_id))));

DROP POLICY IF EXISTS "Users can update their own profile" ON public."user_profiles";
CREATE POLICY "Users can update their own profile" ON public."user_profiles" AS PERMISSIVE FOR UPDATE TO public USING ((public.auth_uid() = ( SELECT users.auth_id
   FROM users
  WHERE (users.id = user_profiles.user_id))));

DROP POLICY IF EXISTS "Users can view their own profile" ON public."user_profiles";
CREATE POLICY "Users can view their own profile" ON public."user_profiles" AS PERMISSIVE FOR SELECT TO public USING ((public.auth_uid() = ( SELECT users.auth_id
   FROM users
  WHERE (users.id = user_profiles.user_id))));

DROP POLICY IF EXISTS "Users can manage own progress" ON public."user_progress";
CREATE POLICY "Users can manage own progress" ON public."user_progress" AS PERMISSIVE FOR ALL TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can manage their settings" ON public."user_settings";
CREATE POLICY "Users can manage their settings" ON public."user_settings" AS PERMISSIVE FOR ALL TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can view their settings" ON public."user_settings";
CREATE POLICY "Users can view their settings" ON public."user_settings" AS PERMISSIVE FOR SELECT TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can update their own skill progress" ON public."user_skill_progress";
CREATE POLICY "Users can update their own skill progress" ON public."user_skill_progress" AS PERMISSIVE FOR ALL TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Users can view their own skill progress" ON public."user_skill_progress";
CREATE POLICY "Users can view their own skill progress" ON public."user_skill_progress" AS PERMISSIVE FOR SELECT TO public USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = public.auth_uid()))));

DROP POLICY IF EXISTS "Allow users to insert own row" ON public."users";
CREATE POLICY "Allow users to insert own row" ON public."users" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((public.auth_uid() = id));

DROP POLICY IF EXISTS "Allow users to read own row" ON public."users";
CREATE POLICY "Allow users to read own row" ON public."users" AS PERMISSIVE FOR SELECT TO public USING ((auth_id = public.auth_uid()));

DROP POLICY IF EXISTS "Allow users to update own row" ON public."users";
CREATE POLICY "Allow users to update own row" ON public."users" AS PERMISSIVE FOR UPDATE TO authenticated USING ((public.auth_uid() = auth_id)) WITH CHECK ((public.auth_uid() = auth_id));

