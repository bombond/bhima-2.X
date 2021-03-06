/**
 * The Enterprises Controller
 *
 * This controller is responsible for creating and updating Enterprises.
 * Each enterprise must necessarily have a name, an abbreviation, a geographical
 * location as well as a currency and it is not possible to remove an enterprise.
 */

const db = require('../../lib/db');
const NotFound = require('../../lib/errors/NotFound');

exports.lookupEnterprise = lookupEnterprise;
exports.lookupByProjectId = lookupByProjectId;

// GET /enterprises
exports.list = function list(req, res, next) {
  let sql = 'SELECT id, name, abbr FROM enterprise';

  if (req.query.detailed === '1') {
    sql = `
      SELECT id, name, abbr, email, po_box, phone,
        BUID(location_id) AS location_id, logo, currency_id,
        gain_account_id, loss_account_id, enable_price_lock
      FROM enterprise LEFT JOIN enterprise_setting
        ON enterprise.id = enterprise_setting.enterprise_id
      ;`;
  }

  db.exec(sql)
    .then(rows => {

      // FIXME(@jniles) - this is kinda hacky.  The idea is to keep settings
      // separate in a JSON file.  This will make more sense as we add enterprise
      // options.
      if (req.query.detailed === '1') {
        rows.forEach(row => {
          row.settings = { enable_price_lock : row.enable_price_lock };
          delete row.enable_price_lock;
        });
      }

      res.status(200).json(rows);
    })
    .catch(next)
    .done();
};


// GET /enterprises/:id
exports.detail = function detail(req, res, next) {
  lookupEnterprise(req.params.id)
    .then(enterprise => {
      res.status(200).json(enterprise);
    })
    .catch(next)
    .done();
};

function lookupEnterprise(id) {
  const sql = `
    SELECT id, name, abbr, email, po_box, phone,
      BUID(location_id) AS location_id, logo, currency_id,
      gain_account_id, loss_account_id
    FROM enterprise WHERE id = ?;
  `;

  const settingsSQL = `
    SELECT enable_price_lock FROM enterprise_setting WHERE enterprise_id = ?;
  `;

  let enterprise;

  return db.one(sql, [id], id, 'enterprise')
    .then(data => {
      enterprise = data;
      return db.exec(settingsSQL, id);
    })
    .then(settings => {
      enterprise.settings = settings[0] || {};
      return enterprise;
    });
}

/**
 * @method lookupByProjectId
 *
 * @description
 * Finds an enterprise via a project id.  This method is useful since most
 * tables only store the project_id instead of the enterprise_id.
 *
 * @param {Number} id - the project id to lookup
 * @returns {Promise} - the result of the database query.
 */
function lookupByProjectId(id) {
  const sql = `
    SELECT e.id, e.name, e.abbr, email, e.po_box, e.phone,
      BUID(e.location_id) AS location_id, e.logo, e.currency_id,
      e.gain_account_id, e.loss_account_id,
      CONCAT_WS(' ', village.name, sector.name, province.name) AS location
    FROM enterprise AS e JOIN project AS p ON e.id = p.enterprise_id
      JOIN village ON e.location_id = village.uuid
      JOIN sector ON village.sector_uuid = sector.uuid
      JOIN province ON sector.province_uuid = province.uuid
    WHERE p.enterprise_id = ?
    LIMIT 1;
  `;

  return db.exec(sql, [id])
    .then((rows) => {
      if (!rows.length) {
        throw new NotFound(`Could not find an enterprise with project id ${id}.`);
      }

      return rows[0];
    });
}

// POST /enterprises
exports.create = function create(req, res, next) {
  const enterprise = db.convert(req.body.enterprise, ['location_id']);
  const sql = 'INSERT INTO enterprise SET ?;';

  db.exec(sql, [enterprise])
    .then(row => {
      res.status(201).json({ id : row.insertId });
    })
    .catch(next)
    .done();
};

// PUT /enterprises/:id
exports.update = function update(req, res, next) {
  const sql = 'UPDATE enterprise SET ? WHERE id = ?;';
  const data = db.convert(req.body, ['location_id']);

  const { settings } = data;
  delete data.settings;

  data.id = req.params.id;

  db.exec(sql, [data, data.id])
    .then((row) => {
      if (!row.affectedRows) {
        throw new NotFound(`Could not find an enterprise with id ${req.params.id}`);
      }

      return db.exec('UPDATE enterprise_setting SET ? WHERE enterprise_id = ?', [settings, req.params.id]);
    })
    .then(() => lookupEnterprise(req.params.id))
    .then((enterprise) => {
      res.status(200).json(enterprise);
    })
    .catch(next)
    .done();
};
