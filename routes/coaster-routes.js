const express = require('express');
const router = express.Router();
const coasterController = require('../controllers/coaster-controller');

router.post('/', coasterController.addCoaster);

router.post('/:coasterId/wagons', coasterController.addWagonToCoaster);

router.delete('/:coasterId/wagons/:wagonId', coasterController.deleteWagonFromCoaster);

router.post('/:coasterId/personel', coasterController.addPersonelToCoaster);

router.delete('/:coasterId/personel/:employeeId', coasterController.deletePersonelFromCoaster);

router.put('/:coasterId', coasterController.updateCoaster);

module.exports = router;
