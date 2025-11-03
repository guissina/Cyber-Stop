prc_realizar_compra_item
DECLARE
  v_preco_item bigint;
  v_total bigint;
  v_moedas_jogador bigint;
  v_novo_saldo bigint;
BEGIN
  -- 1️ Recupera o PREÇO DO ITEM
  SELECT preco INTO v_preco_item
  FROM public.item
  WHERE item_id = p_item_id;

  -- 1.1 Se nenhuma linha for retornada ou preco for nulo
  IF NOT FOUND OR v_preco_item IS NULL THEN
    RAISE EXCEPTION 'Item (%) não encontrado.', p_item_id;
  END IF;

  -- 2 Recupera o SALDO DE MOEDAS DO JOGADOR (com lock)
  SELECT moedas INTO v_moedas_jogador 
  FROM public.jogador 
  WHERE jogador_id = p_jogador_id FOR UPDATE;
  -- 2.1 Se nenhuma linha for retornada ou saldo de do jogador for nulo
  IF NOT FOUND OR v_moedas_jogador IS NULL THEN
    RAISE EXCEPTION 'Jogador não encontrado (ID: %)', p_jogador_id;
  END IF;

  -- 3 Calcula valor total e verifica saldo
  v_total := v_preco_item * p_qtde;
  IF v_moedas_jogador < v_total THEN
    RAISE EXCEPTION 'Saldo de moedas insuficiente.';
  END IF;

  -- 4 Atualiza saldo do jogador
  v_novo_saldo := v_moedas_jogador - v_total;
  UPDATE public.jogador 
  SET moedas = v_novo_saldo 
  WHERE jogador_id = p_jogador_id;

  -- 5 Registra a compra
  INSERT INTO public.compra_item (jogador_id, item_id, preco, qtde)
  VALUES (p_jogador_id, p_item_id, v_preco_item, p_qtde);

  -- 6 Atualiza inventário
  INSERT INTO public.inventario (jogador_id, item_id, qtde)
  VALUES (p_jogador_id, p_item_id, p_qtde)
  ON CONFLICT (jogador_id, item_id)
  DO UPDATE SET
    qtde = public.inventario.qtde + EXCLUDED.qtde,
    data_hora_ultima_atualizacao = now();

  -- 7 Retorna sucesso
  RETURN jsonb_build_object(
    'sucesso', true,
    'mensagem', format('Compra realizada com sucesso! %s unidade(s) do item %s adquiridas.', p_qtde, p_item_id),
    'moedas_restantes', v_novo_saldo
  );

EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'mensagem', format('Erro ao processar compra: %s', SQLERRM)
    );
END;