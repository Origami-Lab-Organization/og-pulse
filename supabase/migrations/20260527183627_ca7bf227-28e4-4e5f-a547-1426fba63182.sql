DO $$
DECLARE
  v_auth_id UUID;
BEGIN
  SELECT auth_id INTO v_auth_id
  FROM public.employees
  WHERE email = 'lucas.sousa@origamila.com.br'
  LIMIT 1;

  UPDATE public.employees
  SET email = 'lucas.sousa@origamilab.com.br',
      updated_at = now()
  WHERE email = 'lucas.sousa@origamila.com.br';

  IF v_auth_id IS NOT NULL THEN
    UPDATE auth.users
    SET email              = 'lucas.sousa@origamilab.com.br',
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at         = now()
    WHERE id = v_auth_id;

    UPDATE auth.identities
    SET identity_data = jsonb_set(identity_data, '{email}', '"lucas.sousa@origamilab.com.br"'),
        updated_at    = now()
    WHERE user_id = v_auth_id
      AND provider  = 'email';
  END IF;

  RAISE NOTICE 'Email corrigido. auth_id encontrado: %', v_auth_id;
END $$;