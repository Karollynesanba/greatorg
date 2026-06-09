-- Great Organico
-- Restore history_events from CSV.
-- Safe: inserts only the records present in the CSV and skips existing IDs.

begin;

insert into public.history_events (id, sort_order, data)
values (1, 0, convert_from(decode('eyJpZCI6MSwiZGF0ZSI6IjIwMjYtMDQtMjgiLCJ0eXBlIjoicG9zdCIsInRpdGxlIjoiUG9zdCBkZSByZWVscyBwdWJsaWNhZG8iLCJyZXN1bHQiOiI0LjhrIGRlIGVuZ2FqYW1lbnRvIG5vIHByaW1laXJvIGRpYSIsIm1ldHJpY3MiOiI1NGsgZGUgYWxjYW5jZSIsImF1dGhvcklkIjoxLCJkZXNjcmlwdGlvbiI6IkJyZW5kYSBwdWJsaWNvdSBvIHJlZWxzIGRlIGJhc3RpZG9yZXMgY29tIGZlY2hhbWVudG8gZm9ydGUuIn0=', 'base64'), 'UTF8')::jsonb)
on conflict (id) do nothing;

insert into public.history_events (id, sort_order, data)
values (100017, 0, convert_from(decode('eyJpZCI6MTAwMDE3LCJkYXRlIjoiMjAyNi0wNi0wOCIsInR5cGUiOiJwb3N0IiwidGl0bGUiOiJTdG9yeSBjcmlhZG8iLCJyZXN1bHQiOiJBZ2VuZGFkbyIsIm1ldHJpY3MiOiIyIHN0b3JpZXMiLCJhdXRob3JJZCI6MSwiZGVzY3JpcHRpb24iOiJCcmVuZGEgY3JpYWRvIDIgc3RvcnkoaWVzKSBlbSAyMDI2LTA2LTA4IDA5OjAwLiJ9', 'base64'), 'UTF8')::jsonb)
on conflict (id) do nothing;

insert into public.history_events (id, sort_order, data)
values (2, 1, convert_from(decode('eyJpZCI6MiwiZGF0ZSI6IjIwMjYtMDQtMzAiLCJ0eXBlIjoiZ29hbCIsInRpdGxlIjoiTWV0YSBkZSBzdG9yaWVzIGNvbmNsdWlkYSIsInJlc3VsdCI6Ik1ldGEgY29sZXRpdmEgYmF0aWRhIiwibWV0cmljcyI6IjEwMCBwb3IgY2VudG8gY29uY2x1aWRvIiwiYXV0aG9ySWQiOjIsImRlc2NyaXB0aW9uIjoiQSBlcXVpcGUgZmVjaG91IG9zIDE2OCBzdG9yaWVzIG5vIHBlcmlvZG8gY29tIHVtYSBkaXN0cmlidWljYW8gdmFyaWF2ZWwgZW50cmUgb3MgdHJlcyBtZW1icm9zLiJ9', 'base64'), 'UTF8')::jsonb)
on conflict (id) do nothing;

insert into public.history_events (id, sort_order, data)
values (100016, 1, convert_from(decode('eyJpZCI6MTAwMDE2LCJkYXRlIjoiMjAyNi0wNi0wOCIsInR5cGUiOiJwb3N0IiwidGl0bGUiOiJTdG9yeSBjcmlhZG8iLCJyZXN1bHQiOiJBZ2VuZGFkbyIsIm1ldHJpY3MiOiI0IHN0b3JpZXMiLCJhdXRob3JJZCI6MSwiZGVzY3JpcHRpb24iOiJCcmVuZGEgY3JpYWRvIDQgc3RvcnkoaWVzKSBlbSAyMDI2LTA2LTA4IDA5OjAwLiJ9', 'base64'), 'UTF8')::jsonb)
on conflict (id) do nothing;

insert into public.history_events (id, sort_order, data)
values (3, 2, convert_from(decode('eyJpZCI6MywiZGF0ZSI6IjIwMjYtMDUtMDEiLCJ0eXBlIjoic2NoZWR1bGUiLCJ0aXRsZSI6IkNhbGVuZGFyaW8gYWp1c3RhZG8iLCJyZXN1bHQiOiJFbnRyZWdhIG1hbnRpZGEgZGVudHJvIGRvIHByYXpvIiwibWV0cmljcyI6IjEgYWp1c3RlIG5vIGZsdXhvIiwiYXV0aG9ySWQiOjMsImRlc2NyaXB0aW9uIjoiVGhpYWdvIHJlb3JnYW5pem91IGEgZmlsYSBkbyBjYXJyb3NzZWwgcGFyYSBlbmNhaXhhciBtZWxob3IgYSBhcHJvdmFjYW8uIn0=', 'base64'), 'UTF8')::jsonb)
on conflict (id) do nothing;

insert into public.history_events (id, sort_order, data)
values (100015, 2, convert_from(decode('eyJpZCI6MTAwMDE1LCJkYXRlIjoiMjAyNi0wNi0wNSIsInR5cGUiOiJwb3N0IiwidGl0bGUiOiJTdG9yeSBhdHVhbGl6YWRvIiwicmVzdWx0IjoiUHVibGljYWRvIiwibWV0cmljcyI6IjEgc3RvcmllcyIsImF1dGhvcklkIjoxLCJkZXNjcmlwdGlvbiI6IkJyZW5kYSBhdHVhbGl6YWRvIDEgc3RvcnkoaWVzKSBlbSAyMDI2LTA2LTA1IDA5OjAwLiJ9', 'base64'), 'UTF8')::jsonb)
on conflict (id) do nothing;

insert into public.history_events (id, sort_order, data)
values (4, 3, convert_from(decode('eyJpZCI6NCwiZGF0ZSI6IjIwMjYtMDUtMDIiLCJ0eXBlIjoicG9zdCIsInRpdGxlIjoiU3RvcmllcyBkZSBjb252ZXJzYW8gbm8gYXIiLCJyZXN1bHQiOiJSZXNwb3N0YXMgb3JnYW5pY2FzIGFjaW1hIGRhIG1lZGlhIiwibWV0cmljcyI6IjEuNWsgaW50ZXJhY29lcyIsImF1dGhvcklkIjoyLCJkZXNjcmlwdGlvbiI6Ikhhbm5haCBwdWJsaWNvdSBhIHNlcXVlbmNpYSBjb20gZm9jbyBlbSByZXNwb3N0YSBlIHByb3ZhIHNvY2lhbC4ifQ==', 'base64'), 'UTF8')::jsonb)
on conflict (id) do nothing;

insert into public.history_events (id, sort_order, data)
values (100014, 3, convert_from(decode('eyJpZCI6MTAwMDE0LCJkYXRlIjoiMjAyNi0wNi0wNSIsInR5cGUiOiJwb3N0IiwidGl0bGUiOiJTdG9yeSBhdHVhbGl6YWRvIiwicmVzdWx0IjoiUHVibGljYWRvIiwibWV0cmljcyI6IjIgc3RvcmllcyIsImF1dGhvcklkIjoxLCJkZXNjcmlwdGlvbiI6IkJyZW5kYSBhdHVhbGl6YWRvIDIgc3RvcnkoaWVzKSBlbSAyMDI2LTA2LTA1IDA5OjAwLiJ9', 'base64'), 'UTF8')::jsonb)
on conflict (id) do nothing;

insert into public.history_events (id, sort_order, data)
values (5, 4, convert_from(decode('eyJpZCI6NSwiZGF0ZSI6IjIwMjYtMDUtMDMiLCJ0eXBlIjoiZ29hbCIsInRpdGxlIjoiUmV2aXNhbyBkbyBtZXMgZmVpdGEiLCJyZXN1bHQiOiJQbGFuZWphbWVudG8gZG8gcHJveGltbyBjaWNsbyBpbmljaWFkbyIsIm1ldHJpY3MiOiI0IG1ldGFzIGFjb21wYW5oYWRhcyIsImF1dGhvcklkIjoxLCJkZXNjcmlwdGlvbiI6IkZlY2hhbWVudG8gY29tIGxlaXR1cmEgZG9zIGNhcmRzLCBkb3MgZ3J1cG9zIGUgZGFzIHByb3hpbWFzIG1ldGFzLiJ9', 'base64'), 'UTF8')::jsonb)
on conflict (id) do nothing;

insert into public.history_events (id, sort_order, data)
values (100013, 4, convert_from(decode('eyJpZCI6MTAwMDEzLCJkYXRlIjoiMjAyNi0wNi0wNSIsInR5cGUiOiJwb3N0IiwidGl0bGUiOiJTdG9yeSBhdHVhbGl6YWRvIiwicmVzdWx0IjoiUHVibGljYWRvIiwibWV0cmljcyI6IjMgc3RvcmllcyIsImF1dGhvcklkIjoxLCJkZXNjcmlwdGlvbiI6IkJyZW5kYSBhdHVhbGl6YWRvIDMgc3RvcnkoaWVzKSBlbSAyMDI2LTA2LTA1IDExOjAwLiJ9', 'base64'), 'UTF8')::jsonb)
on conflict (id) do nothing;

insert into public.history_events (id, sort_order, data)
values (100012, 5, convert_from(decode('eyJpZCI6MTAwMDEyLCJkYXRlIjoiMjAyNi0wNi0wNSIsInR5cGUiOiJwb3N0IiwidGl0bGUiOiJTdG9yeSBhdHVhbGl6YWRvIiwicmVzdWx0IjoiUHVibGljYWRvIiwibWV0cmljcyI6IjEgc3RvcmllcyIsImF1dGhvcklkIjoxLCJkZXNjcmlwdGlvbiI6IkJyZW5kYSBhdHVhbGl6YWRvIDEgc3RvcnkoaWVzKSBlbSAyMDI2LTA2LTA1IDEwOjAwLiJ9', 'base64'), 'UTF8')::jsonb)
on conflict (id) do nothing;

insert into public.history_events (id, sort_order, data)
values (100011, 6, convert_from(decode('eyJpZCI6MTAwMDExLCJkYXRlIjoiMjAyNi0wNi0wMyIsInR5cGUiOiJwb3N0IiwidGl0bGUiOiJTdG9yeSBhdHVhbGl6YWRvIiwicmVzdWx0IjoiUHVibGljYWRvIiwibWV0cmljcyI6IjMgc3RvcmllcyIsImF1dGhvcklkIjoxLCJkZXNjcmlwdGlvbiI6IkJyZW5kYSBhdHVhbGl6YWRvIDMgc3RvcnkoaWVzKSBlbSAyMDI2LTA2LTAzIDExOjAwLiJ9', 'base64'), 'UTF8')::jsonb)
on conflict (id) do nothing;

insert into public.history_events (id, sort_order, data)
values (100010, 7, convert_from(decode('eyJpZCI6MTAwMDEwLCJkYXRlIjoiMjAyNi0wNi0wMyIsInR5cGUiOiJwb3N0IiwidGl0bGUiOiJTdG9yeSBhdHVhbGl6YWRvIiwicmVzdWx0IjoiUHVibGljYWRvIiwibWV0cmljcyI6IjEzIHN0b3JpZXMiLCJhdXRob3JJZCI6MSwiZGVzY3JpcHRpb24iOiJCcmVuZGEgYXR1YWxpemFkbyAxMyBzdG9yeShpZXMpIGVtIDIwMjYtMDYtMDMgMDk6MDAuIn0=', 'base64'), 'UTF8')::jsonb)
on conflict (id) do nothing;

insert into public.history_events (id, sort_order, data)
values (100009, 8, convert_from(decode('eyJpZCI6MTAwMDA5LCJkYXRlIjoiMjAyNi0wNi0wMyIsInR5cGUiOiJwb3N0IiwidGl0bGUiOiJTdG9yeSBhdHVhbGl6YWRvIiwicmVzdWx0IjoiUHVibGljYWRvIiwibWV0cmljcyI6IjQgc3RvcmllcyIsImF1dGhvcklkIjoxLCJkZXNjcmlwdGlvbiI6IkJyZW5kYSBhdHVhbGl6YWRvIDQgc3RvcnkoaWVzKSBlbSAyMDI2LTA2LTAzIDE4OjAwLiJ9', 'base64'), 'UTF8')::jsonb)
on conflict (id) do nothing;

insert into public.history_events (id, sort_order, data)
values (100008, 9, convert_from(decode('eyJpZCI6MTAwMDA4LCJkYXRlIjoiMjAyNi0wNi0wMiIsInR5cGUiOiJwb3N0IiwidGl0bGUiOiJTdG9yeSBhdHVhbGl6YWRvIiwicmVzdWx0IjoiUHVibGljYWRvIiwibWV0cmljcyI6IjEgc3RvcmllcyIsImF1dGhvcklkIjoxLCJkZXNjcmlwdGlvbiI6IkJyZW5kYSBhdHVhbGl6YWRvIDEgc3RvcnkoaWVzKSBlbSAyMDI2LTA2LTAyIDEwOjAwLiJ9', 'base64'), 'UTF8')::jsonb)
on conflict (id) do nothing;

insert into public.history_events (id, sort_order, data)
values (100007, 10, convert_from(decode('eyJpZCI6MTAwMDA3LCJkYXRlIjoiMjAyNi0wNi0wMSIsInR5cGUiOiJwb3N0IiwidGl0bGUiOiJTdG9yeSBjcmlhZG8iLCJyZXN1bHQiOiJQdWJsaWNhZG8iLCJtZXRyaWNzIjoiNCBzdG9yaWVzIiwiYXV0aG9ySWQiOjEsImRlc2NyaXB0aW9uIjoiQnJlbmRhIGNyaWFkbyA0IHN0b3J5KGllcykgZW0gMjAyNi0wNi0wMSAxODowMC4ifQ==', 'base64'), 'UTF8')::jsonb)
on conflict (id) do nothing;

insert into public.history_events (id, sort_order, data)
values (100006, 11, convert_from(decode('eyJpZCI6MTAwMDA2LCJkYXRlIjoiMjAyNi0wNi0wMSIsInR5cGUiOiJwb3N0IiwidGl0bGUiOiJTdG9yeSBjcmlhZG8iLCJyZXN1bHQiOiJQdWJsaWNhZG8iLCJtZXRyaWNzIjoiNSBzdG9yaWVzIiwiYXV0aG9ySWQiOjEsImRlc2NyaXB0aW9uIjoiQnJlbmRhIGNyaWFkbyA1IHN0b3J5KGllcykgZW0gMjAyNi0wNi0wMSAxODowMC4ifQ==', 'base64'), 'UTF8')::jsonb)
on conflict (id) do nothing;

insert into public.history_events (id, sort_order, data)
values (100005, 12, convert_from(decode('eyJpZCI6MTAwMDA1LCJkYXRlIjoiMjAyNi0wNS0yOSIsInR5cGUiOiJwb3N0IiwidGl0bGUiOiJTdG9yeSBjcmlhZG8iLCJyZXN1bHQiOiJBZ2VuZGFkbyIsIm1ldHJpY3MiOiI3MyBzdG9yaWVzIiwiYXV0aG9ySWQiOjEsImRlc2NyaXB0aW9uIjoiQnJlbmRhIGNyaWFkbyA3MyBzdG9yeShpZXMpIGVtIDIwMjYtMDUtMjkgMDk6MDAuIn0=', 'base64'), 'UTF8')::jsonb)
on conflict (id) do nothing;

commit;
