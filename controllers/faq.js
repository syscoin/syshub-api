const { admin } = require('../utils/config');

const getCurrentQuestions = async (req, res, next) => {
  try {
    const faqs = [];
    const { docs } = await admin.firestore()
      .collection(process.env.COLLECTION_NAME_FAQ)
      .orderBy('created_at', 'desc')
      .get()
      .catch((err) => {
        throw err;
      });

    docs.forEach((data) => {
      const {
        _fieldsProto: {
          title,
          description,
          created_at,
          // updated_at,
        },
      } = data;
      faqs.push({
        uid: data.id,
        title: title.stringValue,
        description: description.stringValue,
        created_at: Number(created_at.timestampValue.seconds),
        // updated_at: updated_at ? updated_at.timestampValue.nanos : null,
      });
    });
    // faqs.sort((x, y) => x.created_at - y.created_at);
    return res.status(200).json({ ok: true, faqs: faqs.reverse() });
  } catch (err) {
    next(err);
  }
};

const getALlQuestions = async (req, res, next) => {
  try {
    let documents;
    const pageSize = 20;
    const { title } = req.query;
    let { page } = req.query;
    const faqs = [];
    if (typeof page === 'undefined' || page === '0') page = 1;
    if (typeof title !== 'undefined' && title !== '') {
      documents = await admin.firestore()
        .collection(process.env.COLLECTION_NAME_FAQ)
        // .orderBy('title')
        // .startAt([title])
        // .endAt([`${title}\uf8ff`])
        // .where('title', '>=', title)
        // .where('title', '<=', `${title}\uf8ff`)
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .get()
        .catch((err) => {
          throw err;
        });
    } else {
      documents = await admin.firestore()
        .collection(process.env.COLLECTION_NAME_FAQ)
        .orderBy('created_at', 'asc')
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .get()
        .catch((err) => {
          throw err;
        });
    }

    const { _docs: docs } = await admin.firestore()
      .collection(process.env.COLLECTION_NAME_FAQ)
      .get()
      .catch((err) => { throw err; });

    // eslint-disable-next-line no-underscore-dangle
    const sizePerPage = documents._docs().length;
    const totalPag = Math.ceil(docs().length / pageSize);
    // eslint-disable-next-line no-underscore-dangle
    documents._docs().map((elem) => {
      const { _fieldsProto: fieldsProto } = elem;
      const newData = {};
      newData.uid = elem.id;
      newData.title = fieldsProto.title.stringValue;
      newData.description = fieldsProto.description.stringValue;
      newData.created_at = fieldsProto.created_at.timestampValue.seconds;
      newData.updated_at = fieldsProto.updated_at ? fieldsProto.updated_at.timestampValue.seconds : null;
      faqs.push(newData);
    });

    return res.status(200).json({
      ok: true,
      pageSize,
      sizePerPage,
      totalRecords: docs().length,
      totalPag,
      currentPage: Number(page),
      previousPage: Number(page) - 1,
      nextPage: Number(page) + 1,
      faqs,
    });
  } catch (err) {
    next(err);
  }
};

const getQuestions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fq = {};
    const { _fieldsProto: fieldsProto } = await admin.firestore()
      .collection(process.env.COLLECTION_NAME_FAQ)
      .doc(id)
      .get()
      .catch((err) => { throw err; });

    if (typeof fieldsProto === 'undefined') {
      return res.status(406).json({ ok: false, message: 'document not found please try again' });
    }

    Object.keys(fieldsProto).forEach((key) => {
      fq[key] = fieldsProto[key].stringValue;
      fq.created_at = fieldsProto.created_at.timestampValue.seconds;
      if (key === 'updated_at') {
        fq.updated_at = fieldsProto.updated_at.timestampValue.seconds;
      }
    });

    return res.status(200).json({ ok: true, fq });
  } catch (err) {
    next(err);
  }
};

const createQuestions = async (req, res, next) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res.status(406).json({ ok: false, message: 'required fields' });
    }

    const verifyName = await admin.firestore()
      .collection(process.env.COLLECTION_NAME_FAQ)
      .where('title', '==', title)
      .get()
      .catch((err) => {
        throw err;
      });

    if (verifyName.size > 0) {
      return res.status(406).json({ ok: false, message: 'there is already a question with this title' });
    }

    await admin.firestore()
      .collection(process.env.COLLECTION_NAME_FAQ)
      .add({
        title,
        description,
        created_at: admin.firestore.Timestamp.now(),
      })
      .catch((err) => {
        throw err;
      });
    return res.status(200).json({ ok: false, message: 'data saved successfully' });
  } catch (err) {
    next(err);
  }
};

const updateQuestions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data } = req.body;
    const newData = {};
    if (!data) return res.status(406).json({ ok: false, message: 'Required fields' });
    if (typeof data !== 'object') {
      return res.status(406).json({ ok: false, message: 'invalid update form' });
    }
    const { _fieldsProto: fieldsProto } = await admin.firestore()
      .collection(process.env.COLLECTION_NAME_FAQ)
      .doc(id)
      .get()
      .catch((err) => { throw err; });

    if (typeof fieldsProto === 'undefined') {
      return res.status(406).json({ ok: false, message: 'document not found please try again' });
    }

    Object.keys(data).forEach((key) => {
      newData[key] = data[key];

      newData.created_at = admin.firestore.Timestamp.fromDate(new Date(fieldsProto.created_at.timestampValue.seconds * 1000));
      newData.updated_at = admin.firestore.Timestamp.now();
    });

    await admin.firestore()
      .collection(process.env.COLLECTION_NAME_FAQ)
      .doc(id)
      .update(newData)
      .catch((err) => {
        throw err;
      });

    return res.status(200).json({ ok: true, message: 'updated data' });
  } catch (err) {
    next(err);
  }
};

const deleteQuestions = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { _fieldsProto: fieldsProto } = await admin.firestore()
      .collection(process.env.COLLECTION_NAME_FAQ)
      .doc(id)
      .get()
      .catch((err) => {
        throw err;
      });

    if (typeof fieldsProto === 'undefined') {
      return res.status(406).json({ ok: false, message: 'document not found please try again' });
    }

    await admin.firestore()
      .collection(process.env.COLLECTION_NAME_FAQ)
      .doc(id)
      .delete()
      .catch((err) => {
        throw err;
      });

    return res.status(200).json({ ok: true, message: 'faq successfully removed' });
  } catch (err) {
    next(err);
  }
};
module.exports = {
  getCurrentQuestions,
  getALlQuestions,
  getQuestions,
  createQuestions,
  updateQuestions,
  deleteQuestions,
};
