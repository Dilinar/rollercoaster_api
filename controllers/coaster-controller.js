const logger = require('../utils/logger');
// const { v4: uuidv4 } = require('uuid'); 
const redisClient = require('../utils/redis-client');

async function setData(key, value) {
    await redisClient.set(key, JSON.stringify(value));
}

async function getData(key) {
    const data = await redisClient.get(key);
    return JSON.parse(data);
}

async function addCoaster(req, res) {
    const { required_personnel, wagons_cap, customers, route_length, hours_from, hours_to } = req.body;

    if (!required_personnel || !wagons_cap, !customers || !route_length || !hours_from || !hours_to) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // const coasterId = uuidv4();
    const coasterId = await redisClient.incr('coaster_id_counter');

    const newCoaster = {
        id: coasterId,
        required_personnel,
        wagons_cap,
        customers,
        route_length,
        hours_from,
        hours_to,
        wagons: [],
        personel: []
    };

    await setData(`coaster:${coasterId}`, newCoaster);
    logger.info(`Coaster: ${coasterId} registered`);
    res.status(201).json({ message: 'Coaster registered successfully' });
}

async function addWagonToCoaster(req, res) {
    const { coasterId } = req.params;
    const { seats, speed } = req.body;

    if (!seats || !speed) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Nie wiem jaka jest wizja frontu, który ma być podpięty do tego api, więc tworzę id kolejek jak i wagonów w taki sposób, aby możnabyło je łatwo używć manualnie.
    // Jednak zdecydowanie jestem za tym żeby generować id przez uuidv4, wyświetlać na froncie listę kolejek i przekazywać id kolejki do request.body poprzez kliknięcie kolejki z listy.
    const wagonId = await redisClient.incr('wagon_id_counter');

    const newCart = {
        id: wagonId,
        seats,
        speed
    };

    const coaster = await getData(`coaster:${coasterId}`);
    if (!coaster) {
        logger.warn(`Coaster: ${coasterId}  not found`);
        return res.status(404).json({ error: 'Coaster not found' });
    }

    if (coaster.wagons.length === coaster.wagons_cap) {
        logger.warn(`Coaster: ${coasterId} has reached maximum number of wagons`);
        return res.status(400).json({ error: 'Coaster has reached maximum number of wagons' });
    } else if (coaster.wagons.length > coaster.wagons_cap) {
        logger.warn(`Coaster: ${coasterId} has exceeded maximum number of wagons`);
        return res.status(400).json({ error: 'Coaster has exceeded maximum number of wagons' });
    }

    coaster.wagons = coaster.wagons || [];
    coaster.wagons.push(newCart);

    await setData(`coaster:${coasterId}`, coaster);

    logger.info(`Wagon: ${wagonId} added to coaster: ${coasterId}`);
    res.status(201).json({ message: 'Wagon added successfully' });
}

async function deleteWagonFromCoaster(req, res) {
    const { coasterId, wagonId } = req.params;

    const coaster = await getData(`coaster:${coasterId}`);

    if (!coaster) {
        logger.warn(`Coaster: ${coasterId}  not found`);
        return res.status(404).json({ error: 'Coaster not found' });
    }

    const wagon = coaster.wagons.find(w => w.id === parseInt(wagonId));

    if (!wagon) {
        logger.warn(`Wagon: ${wagonId}  not found`);
        return res.status(404).json({ error: 'Wagon not found' });
    }

    coaster.wagons = coaster.wagons.filter(w => w.id !== wagon.id);

    await setData(`coaster:${coasterId}`, coaster);
    logger.info(`Wagon: ${wagon.id} deleted from coaster: ${coasterId}`);
    res.status(200).json({ message: 'Wagon deleted successfully' });
}

async function addPersonelToCoaster(req, res) {
    const { coasterId } = req.params;
    const { id, name, surename, role } = req.body;

    if (!id || !name || !surename || !role) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const newEmployee= {
        id,
        name,
        surename,
        role
    };

    const coaster = await getData(`coaster:${coasterId}`);
    if (!coaster) {
        logger.warn(`Coaster: ${coasterId}  not found`);
        return res.status(404).json({ error: 'Coaster not found' });
    }
    
    if (coaster.personel.find(p => p.id === newEmployee.id)) {
        logger.warn(`Employee: ${id} already exists in coaster: ${coasterId}`);
        return res.status(400).json({ error: 'Employee already exists' });
    }

    if (coaster.personel.length === coaster.required_personnel) {
        logger.warn(`Coaster: ${coasterId} has reached maximum number of personnel`);
        return res.status(400).json({ error: 'Coaster has reached maximum number of personnel' });
    } else if (coaster.personel.length > coaster.required_personnel) {
        logger.warn(`Coaster: ${coasterId} has exceeded maximum number of personnel`);
        return res.status(400).json({ error: 'Coaster has exceeded maximum number of personnel' });
    }

    coaster.personel = coaster.personel || [];
    coaster.personel.push(newEmployee);

    await setData(`coaster:${coasterId}`, coaster);

    logger.info(`Employee: ${name} added as: ${role} to coaster: ${coasterId}`);
    res.status(201).json({ message: 'Employee added successfully' });
}

async function deletePersonelFromCoaster(req, res) {
    const { coasterId, employeeId } = req.params;

    const coaster = await getData(`coaster:${coasterId}`);

    if (!coaster) {
        logger.warn(`Coaster: ${coasterId}  not found`);
        return res.status(404).json({ error: 'Coaster not found' });
    }

    const employee = coaster.personel.find(p => p.id === parseInt(employeeId));

    if (!employee) {
        logger.warn(`Employee: ${employeeId}  not found`);
        return res.status(404).json({ error: 'Employee not found' });
    }

    coaster.personel = coaster.personel.filter(p => p.id !== employee.id);
    await setData(`coaster:${coasterId}`, coaster);
    logger.info(`Employee: ${employee.id} removed from coaster: ${coasterId}`);
    res.status(200).json({ message: 'Employee removed successfully' });
}

async function updateCoaster(req, res) {
    const { coasterId } = req.params;
    const { required_personnel, wagons_cap, customers, hours_from, hours_to } = req.body;

    if (!required_personnel || !wagons_cap, !customers || !hours_from || !hours_to) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const updatedCoaster = {
        required_personnel,
        wagons_cap,
        customers,
        hours_from,
        hours_to,
    };

    const coaster = await getData(`coaster:${coasterId}`);
    if (!coaster) {
        logger.warn(`Coaster: ${coasterId} not found`);
        return res.status(404).json({ error: 'Coaster not found' });
    }
    Object.assign(coaster, updatedCoaster);
    await setData(`coaster:${coasterId}`, coaster);
    logger.info(`Coaster: ${coasterId} updated`);
    res.status(200).json({ message: 'Coaster updated successfully' });
}

module.exports = {
    addCoaster,
    addWagonToCoaster,
    deleteWagonFromCoaster,
    addPersonelToCoaster,
    deletePersonelFromCoaster,
    updateCoaster
};
