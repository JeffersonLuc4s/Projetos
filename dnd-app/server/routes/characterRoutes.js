// server/routes/characterRoutes.js
'use strict';

const express = require('express');
const { pool, queryOne, query } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

/* ═══════════════════════════════════════════════════════════
   HELPER — load a full character from all sub-tables
═══════════════════════════════════════════════════════════ */
async function loadFullCharacter(charId, userId) {
  // Verify ownership
  const ch = await queryOne(
    'SELECT * FROM characters WHERE id = $1 AND user_id = $2',
    [charId, userId]
  );
  if (!ch) return null;

  // Parallel fetches for all related data
  const [
    attrs, pers, appear, magic, coins,
    stProfs, skillP, inventory, weapons,
    spells, conditions, resists, langs,
  ] = await Promise.all([
    queryOne('SELECT * FROM attributes   WHERE character_id = $1', [charId]),
    queryOne('SELECT * FROM personality  WHERE character_id = $1', [charId]),
    queryOne('SELECT * FROM appearance   WHERE character_id = $1', [charId]),
    queryOne('SELECT * FROM magic_config WHERE character_id = $1', [charId]),
    queryOne('SELECT * FROM coins        WHERE character_id = $1', [charId]),
    query('SELECT atributo    FROM saving_throw_profs WHERE character_id = $1', [charId]),
    query('SELECT skill_id    FROM skill_profs        WHERE character_id = $1', [charId]),
    query('SELECT *           FROM inventory          WHERE character_id = $1', [charId]),
    query('SELECT *           FROM weapons            WHERE character_id = $1', [charId]),
    query('SELECT *           FROM spells             WHERE character_id = $1', [charId]),
    query('SELECT condition_id FROM conditions        WHERE character_id = $1', [charId]),
    query('SELECT descricao   FROM resistances        WHERE character_id = $1', [charId]),
    query('SELECT idioma      FROM languages          WHERE character_id = $1', [charId]),
  ]);

  const savingThrows = {};
  stProfs.forEach(r => { savingThrows[r.atributo] = true; });

  const pericias = {};
  skillP.forEach(r => { pericias[r.skill_id] = true; });

  const condicoes = {};
  conditions.forEach(r => { condicoes[r.condition_id] = true; });

  const spellList = spells.map(s => ({
    id: s.spell_key, nome: s.nome, nivel: s.nivel, preparada: s.preparada,
  }));

  return {
    _id: ch.id,
    personagem: {
      nome: ch.nome, raca: ch.raca, classe: ch.classe,
      racaId: ch.raca_id, subracaId: ch.subraca_id,
      classeId: ch.classe_id, backgroundId: ch.background_id,
      tendencia: ch.tendencia,
    },
    atributos: {
      forca:        String(attrs?.forca        ?? 10),
      destreza:     String(attrs?.destreza     ?? 10),
      constituicao: String(attrs?.constituicao ?? 10),
      inteligencia: String(attrs?.inteligencia ?? 10),
      sabedoria:    String(attrs?.sabedoria    ?? 10),
      carisma:      String(attrs?.carisma      ?? 10),
    },
    atributosBase: {
      forca:        String(attrs?.forca_base        ?? 10),
      destreza:     String(attrs?.destreza_base     ?? 10),
      constituicao: String(attrs?.constituicao_base ?? 10),
      inteligencia: String(attrs?.inteligencia_base ?? 10),
      sabedoria:    String(attrs?.sabedoria_base    ?? 10),
      carisma:      String(attrs?.carisma_base      ?? 10),
    },
    vida:    { atual: ch.hp_atual, max: ch.hp_max, temp: ch.hp_temp },
    combate: {
      nivel: ch.nivel, xp: ch.xp, velocidade: ch.velocidade,
      armadura: ch.armadura, escudo: ch.escudo,
    },
    hitDice:    { total: ch.hd_total, usados: ch.hd_usados },
    exaustao:   ch.exaustao,
    inspiracao: ch.inspiracao,
    observacoes: ch.observacoes,
    proficiencias: { savingThrows },
    pericias,
    condicoes,
    resistencias: resists.map(r => r.descricao),
    armas: weapons.map(w => ({
      id: w.weapon_key, nome: w.nome, dano: w.dano,
      atributo: w.atributo, proficiente: w.proficiente, bonusExtra: w.bonus_extra,
    })),
    inventario: inventory.map(i => ({
      id: i.item_key, nome: i.nome, quantidade: i.quantidade, descricao: i.descricao,
    })),
    magias: {
      atributo: magic?.atributo || '',
      slotsUsados: JSON.parse(magic?.slots_usados || '[]'),
      lista: spellList,
    },
    personalidade: {
      tracos:   pers?.tracos   || '', ideais:   pers?.ideais   || '',
      vinculos: pers?.vinculos || '', defeitos: pers?.defeitos || '',
    },
    aparencia: {
      idade:  appear?.idade  || '', altura: appear?.altura || '',
      peso:   appear?.peso   || '', olhos:  appear?.olhos  || '',
      cabelo: appear?.cabelo || '', pele:   appear?.pele   || '',
    },
    idiomas: langs.map(l => l.idioma),
    moedas: { pp: coins?.pp||0, po: coins?.po||0, pe: coins?.pe||0, pc: coins?.pc||0 },
    background: { id: ch.background_id },
  };
}

/* ═══════════════════════════════════════════════════════════
   HELPER — save full character inside a single transaction
═══════════════════════════════════════════════════════════ */
async function saveFullCharacter(userId, data, existingId = null) {
  const p  = data.personagem    || {};
  const a  = data.atributos     || {};
  const ab = data.atributosBase || {};
  const v  = data.vida          || {};
  const c  = data.combate       || {};
  const hd = data.hitDice       || {};
  const pe = data.personalidade || {};
  const ap = data.aparencia     || {};
  const m  = data.magias        || {};
  const mo = data.moedas        || {};
  const st = data.proficiencias?.savingThrows || {};
  const sk = data.pericias      || {};
  const co = data.condicoes     || {};

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let charId;

    if (existingId) {
      // ── UPDATE ──────────────────────────────────────────────
      await client.query(`
        UPDATE characters SET
          nome=$1, raca=$2, classe=$3, raca_id=$4, subraca_id=$5,
          classe_id=$6, background_id=$7, tendencia=$8,
          nivel=$9, xp=$10, velocidade=$11, armadura=$12, escudo=$13,
          hp_atual=$14, hp_max=$15, hp_temp=$16,
          hd_total=$17, hd_usados=$18, exaustao=$19, inspiracao=$20,
          observacoes=$21, updated_at=NOW()
        WHERE id=$22 AND user_id=$23
      `, [
        p.nome||'', p.raca||'', p.classe||'', p.racaId||'', p.subracaId||'',
        p.classeId||'', p.backgroundId||'', p.tendencia||'',
        c.nivel||1, c.xp||0, c.velocidade||30,
        c.armadura||'sem_armadura', !!c.escudo,
        v.atual||0, v.max||0, v.temp||0,
        hd.total||1, hd.usados||0,
        data.exaustao||0, !!data.inspiracao, data.observacoes||'',
        existingId, userId,
      ]);
      charId = existingId;

    } else {
      // ── INSERT ──────────────────────────────────────────────
      const { rows } = await client.query(`
        INSERT INTO characters
          (user_id, nome, raca, classe, raca_id, subraca_id, classe_id, background_id,
           tendencia, nivel, xp, velocidade, armadura, escudo,
           hp_atual, hp_max, hp_temp, hd_total, hd_usados, exaustao, inspiracao, observacoes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
        RETURNING id
      `, [
        userId, p.nome||'', p.raca||'', p.classe||'', p.racaId||'', p.subracaId||'',
        p.classeId||'', p.backgroundId||'', p.tendencia||'',
        c.nivel||1, c.xp||0, c.velocidade||30,
        c.armadura||'sem_armadura', !!c.escudo,
        v.atual||0, v.max||0, v.temp||0,
        hd.total||1, hd.usados||0,
        data.exaustao||0, !!data.inspiracao, data.observacoes||'',
      ]);
      charId = rows[0].id;
    }

    // ── Attributes upsert ───────────────────────────────────
    await client.query(`
      INSERT INTO attributes
        (character_id, forca, destreza, constituicao, inteligencia, sabedoria, carisma,
         forca_base, destreza_base, constituicao_base, inteligencia_base, sabedoria_base, carisma_base)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (character_id) DO UPDATE SET
        forca=$2, destreza=$3, constituicao=$4, inteligencia=$5, sabedoria=$6, carisma=$7,
        forca_base=$8, destreza_base=$9, constituicao_base=$10,
        inteligencia_base=$11, sabedoria_base=$12, carisma_base=$13
    `, [
      charId,
      parseInt(a.forca)||10,  parseInt(a.destreza)||10,  parseInt(a.constituicao)||10,
      parseInt(a.inteligencia)||10, parseInt(a.sabedoria)||10, parseInt(a.carisma)||10,
      parseInt(ab.forca)||10, parseInt(ab.destreza)||10,  parseInt(ab.constituicao)||10,
      parseInt(ab.inteligencia)||10, parseInt(ab.sabedoria)||10, parseInt(ab.carisma)||10,
    ]);

    // ── Clear + re-insert set-like tables ──────────────────

    await client.query('DELETE FROM saving_throw_profs WHERE character_id=$1', [charId]);
    for (const [k, v] of Object.entries(st)) {
      if (v) await client.query(
        'INSERT INTO saving_throw_profs (character_id, atributo) VALUES ($1,$2)',
        [charId, k]
      );
    }

    await client.query('DELETE FROM skill_profs WHERE character_id=$1', [charId]);
    for (const [k, v] of Object.entries(sk)) {
      if (v) await client.query(
        'INSERT INTO skill_profs (character_id, skill_id) VALUES ($1,$2)',
        [charId, k]
      );
    }

    await client.query('DELETE FROM conditions WHERE character_id=$1', [charId]);
    for (const [k, v] of Object.entries(co)) {
      if (v) await client.query(
        'INSERT INTO conditions (character_id, condition_id) VALUES ($1,$2)',
        [charId, k]
      );
    }

    await client.query('DELETE FROM resistances WHERE character_id=$1', [charId]);
    for (const r of (data.resistencias || [])) {
      if (r) await client.query(
        'INSERT INTO resistances (character_id, descricao) VALUES ($1,$2)',
        [charId, r]
      );
    }

    await client.query('DELETE FROM weapons WHERE character_id=$1', [charId]);
    for (const w of (data.armas || [])) {
      await client.query(
        'INSERT INTO weapons (character_id, weapon_key, nome, dano, atributo, proficiente, bonus_extra) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [charId, w.id||'', w.nome||'', w.dano||'', w.atributo||'forca', !!w.proficiente, w.bonusExtra||0]
      );
    }

    await client.query('DELETE FROM inventory WHERE character_id=$1', [charId]);
    for (const i of (data.inventario || [])) {
      await client.query(
        'INSERT INTO inventory (character_id, item_key, nome, quantidade, descricao) VALUES ($1,$2,$3,$4,$5)',
        [charId, i.id||'', i.nome||'', i.quantidade||1, i.descricao||'']
      );
    }

    await client.query('DELETE FROM spells WHERE character_id=$1', [charId]);
    for (const s of (m.lista || [])) {
      await client.query(
        'INSERT INTO spells (character_id, spell_key, nome, nivel, preparada) VALUES ($1,$2,$3,$4,$5)',
        [charId, s.id||'', s.nome||'', s.nivel||0, !!s.preparada]
      );
    }

    // ── Upsert single-row tables ────────────────────────────

    await client.query(`
      INSERT INTO magic_config (character_id, atributo, slots_usados)
      VALUES ($1,$2,$3)
      ON CONFLICT (character_id) DO UPDATE SET atributo=$2, slots_usados=$3
    `, [charId, m.atributo||'', JSON.stringify(m.slotsUsados||[])]);

    await client.query(`
      INSERT INTO personality (character_id, tracos, ideais, vinculos, defeitos)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (character_id) DO UPDATE SET tracos=$2, ideais=$3, vinculos=$4, defeitos=$5
    `, [charId, pe.tracos||'', pe.ideais||'', pe.vinculos||'', pe.defeitos||'']);

    await client.query(`
      INSERT INTO appearance (character_id, idade, altura, peso, olhos, cabelo, pele)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (character_id) DO UPDATE SET idade=$2, altura=$3, peso=$4, olhos=$5, cabelo=$6, pele=$7
    `, [charId, ap.idade||'', ap.altura||'', ap.peso||'', ap.olhos||'', ap.cabelo||'', ap.pele||'']);

    await client.query('DELETE FROM languages WHERE character_id=$1', [charId]);
    for (const l of (data.idiomas || [])) {
      if (l) await client.query(
        'INSERT INTO languages (character_id, idioma) VALUES ($1,$2)',
        [charId, l]
      );
    }

    await client.query(`
      INSERT INTO coins (character_id, pp, po, pe, pc)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (character_id) DO UPDATE SET pp=$2, po=$3, pe=$4, pc=$5
    `, [charId, mo.pp||0, mo.po||0, mo.pe||0, mo.pc||0]);

    await client.query('COMMIT');
    return charId;

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/* ─────────────────────────────────────────
   GET /api/characters
───────────────────────────────────────── */
router.get('/', async (req, res) => {
  try {
    const chars = await query(
      'SELECT id, nome, raca, classe, nivel, updated_at FROM characters WHERE user_id=$1 ORDER BY updated_at DESC',
      [req.user.userId]
    );
    return res.json(chars);
  } catch (err) {
    console.error('[GET /characters]', err);
    return res.status(500).json({ error: 'Erro ao listar personagens.' });
  }
});

/* ─────────────────────────────────────────
   GET /api/characters/:id
───────────────────────────────────────── */
router.get('/:id', async (req, res) => {
  try {
    const char = await loadFullCharacter(parseInt(req.params.id), req.user.userId);
    if (!char) return res.status(404).json({ error: 'Personagem não encontrado.' });
    return res.json(char);
  } catch (err) {
    console.error('[GET /characters/:id]', err);
    return res.status(500).json({ error: 'Erro ao carregar personagem.' });
  }
});

/* ─────────────────────────────────────────
   POST /api/characters
───────────────────────────────────────── */
router.post('/', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Corpo da requisição inválido.' });
    }
    const charId = await saveFullCharacter(req.user.userId, req.body, null);
    const char   = await loadFullCharacter(charId, req.user.userId);
    return res.status(201).json(char);
  } catch (err) {
    console.error('[POST /characters]', err);
    return res.status(500).json({ error: 'Erro ao criar personagem.' });
  }
});

/* ─────────────────────────────────────────
   PUT /api/characters/:id
───────────────────────────────────────── */
router.put('/:id', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Corpo da requisição inválido.' });
    }
    const id = parseInt(req.params.id);

    const existing = await queryOne(
      'SELECT id FROM characters WHERE id=$1 AND user_id=$2',
      [id, req.user.userId]
    );
    if (!existing) return res.status(404).json({ error: 'Personagem não encontrado.' });

    await saveFullCharacter(req.user.userId, req.body, id);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[PUT /characters/:id]', err);
    return res.status(500).json({ error: 'Erro ao salvar personagem.' });
  }
});

/* ─────────────────────────────────────────
   DELETE /api/characters/:id
───────────────────────────────────────── */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query(
      'DELETE FROM characters WHERE id=$1 AND user_id=$2',
      [id, req.user.userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Personagem não encontrado.' });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /characters/:id]', err);
    return res.status(500).json({ error: 'Erro ao deletar personagem.' });
  }
});

module.exports = router;
