var mongoClient = require("mongodb").MongoClient,
    db;

function isObject(obj) {
    return Object.keys(obj).length > 0 && obj.constructor === Object;
}

export class mongoService {

    constructor() {

    }
    db: any;
    async connect(dbName: string, onSuccess, onFailure) {
        try {
            var connection = await mongoClient.connect('mongodb://localhost:27017', { useNewUrlParser: true });
            this.db = connection.db(dbName);
            console.log("MongoClient Connection successfull.");
            onSuccess();
        }
        catch (ex) {
            console.log("Error caught,", ex);
            onFailure(ex);
        }
    }


    async insertDocument(collectionName: string, doc) {
        try {
            return await this.db.collection(collectionName).insertOne(doc);
        }
        catch (e) {
            console.log("mongoClient.insertDocumentWithIndex: Error caught,", e);
            return Promise.reject(e);
        }
    }

    async findDocFieldsByFilter(collectionName: string, query, projection?, lmt?) {
        if (!query) {
            throw Error("mongoClient.findDocFieldsByFilter: query is not an object");
        }
        return await this.db.collection(collectionName).find(query, {
            projection: projection || {},
            limit: lmt || 0
        }).toArray();
    }

    async findDocByAggregation(coll, query) {
        if (!query.length) {
            throw Error("mongoClient.findDocByAggregation: query is not an object");
        }
        return this.db.collection(coll).aggregate(query).toArray();
    }

    async getDocumentCountByQuery(coll, query) {
        return this.db.collection(coll).estimatedDocumentCount(query || {})
    }

    async findOneAndUpdate(coll, query, values, option) {
        if (!(isObject(values) && isObject(query))) {
            throw Error("mongoClient.UpdateDocument: values and query should be an object");
        }
        return this.db.collection(coll).findOneAndUpdate(query, { $set: values }, option || {})
    }

    //     // async modifyOneDocument(coll, query, values, option) {
    //     //     if (!(isObject(values) && isObject(query))) {
    //     //         throw Error("mongoClient.ModifyOneDocument: values, query and option should be an object");
    //     //     }
    //     //     return await this.db.collection(coll).updateOne(query, values, option || {})
    //     // }


    // }

    // // module.exports = {
    // //     mongoDbClient: mongoDbClient
}


