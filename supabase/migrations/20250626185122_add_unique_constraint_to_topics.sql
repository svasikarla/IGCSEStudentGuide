ALTER TABLE public.topics ADD CONSTRAINT topics_subject_id_title_key UNIQUE (subject_id, title);
