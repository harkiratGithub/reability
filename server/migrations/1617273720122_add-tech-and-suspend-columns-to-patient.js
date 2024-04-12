exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('tech_issue_types', ['Non-blocking', 'Blocking', '<Empty>']);
  pgm.createType('suspend_types', ['Vacation', 'LOA', 'Financial', 'Tech', 'Concluded', '<Empty>']);
  pgm.addColumns('patient', { suspend: { type: 'suspend_types', default: '<Empty>' } });
  pgm.addColumns('patient', { tech_issue: { type: 'tech_issue_types', default: '<Empty>' } });
  pgm.addColumns('patient', { tech_reason: { type: 'text', default: '' } });
};

exports.down = (pgm) => {
  pgm.dropColumns('patient', ['suspend'], { ifExist: true });
  pgm.dropColumns('patient', ['tech_issue'], { ifExist: true });
  pgm.dropColumns('patient', ['tech_reason'], { ifExist: true });
  pgm.dropType('tech_issue_types');
  pgm.dropType('suspend_types');
};
