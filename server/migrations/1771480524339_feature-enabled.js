exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('feature_enabled', {
    id: {
      type: 'serial',
      primaryKey: true
    },

    feature_id: {
      type: 'integer',
      references: 'features',
      onDelete: 'cascade'
    },

    institute_id: {
      type: 'integer',
      notNull: true
    },

    enabled_status: {
      type: 'boolean',
      notNull: true,
      default: false
    },

    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()')
    },

    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()')
    }
  });

  // Optional but Recommended: Prevent duplicate feature per institute
  pgm.addConstraint(
    'feature_enabled',
    'unique_feature_per_institute',
    'UNIQUE(feature_id, institute_id)'
  );
};

exports.down = (pgm) => {
  pgm.dropTable('feature_enabled');
};
