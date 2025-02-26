import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import {ec} from 'elliptic';
import {blake2b} from 'blakejs';
import path from 'path';
import {BinaryWriter} from 'google-protobuf';

const DEPLOY_PROTO_PATH = path.resolve(__dirname, '../protos/DeployServiceV1.proto');
const PROPOSE_PROTO_PATH = path.resolve(__dirname, '../protos/ProposeServiceV1.proto');

const deployPackageDefinition = protoLoader.loadSync(DEPLOY_PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const proposePackageDefinition = protoLoader.loadSync(PROPOSE_PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});


const deployLoadedDefinition = grpc.loadPackageDefinition(deployPackageDefinition) as any;
const proposeLoadedDefinition = grpc.loadPackageDefinition(proposePackageDefinition) as any;

const deployServiceClient = deployLoadedDefinition.casper?.v1?.DeployService;
const proposeServiceClient = proposeLoadedDefinition.casper?.v1?.ProposeService;

if (!deployServiceClient) {
    console.error("❌ DeployService not found in loadedDefinition!");
    process.exit(1);
}

if (!proposeServiceClient) {
    console.error("❌ ProposeService not found in loadedDefinition!");
    process.exit(1);
}

const deployClient = new deployServiceClient('localhost:40401', grpc.credentials.createInsecure());
const proposeClient = new proposeServiceClient('localhost:40402', grpc.credentials.createInsecure());

// console.log("🔹 Available gRPC methods for deployServiceClient:", Object.keys(deployClient.__proto__));
// console.log("🔹 Available gRPC methods for proposeServiceClient:", Object.keys(proposeClient.__proto__));

export interface UnsignedDeployData {
    readonly term: string;
    readonly timestamp: number;
    readonly phloLimit: number;
    readonly phloPrice: number;
    readonly validAfterBlockNumber: number;
    readonly shardId: string;
}

export interface DeploySignedProto extends UnsignedDeployData {
    readonly sigAlgorithm: string;
    readonly deployer: Uint8Array;
    readonly sig: Uint8Array;
}

export const signDeploy = function (privateKey: ec.KeyPair | string, deployObj: UnsignedDeployData): DeploySignedProto {
    const { term, timestamp, phloLimit, phloPrice, validAfterBlockNumber, shardId } = deployObj;
    const sigAlgorithm = 'secp256k1';

    const crypt = new ec(sigAlgorithm);
    const key = getSignKey(crypt, privateKey);

    const unsignedDeploy = { term, timestamp, phloLimit, phloPrice, validAfterBlockNumber, shardId };

    const deploySerialized = deployDataProtobufSerialize(unsignedDeploy);
    //console.log("Sign deploy - Serialized DeployDataProto (hex) [" + deploySerialized.length + " bytes]:", Buffer.from(deploySerialized).toString('hex'));

    const hashed = blake2b(deploySerialized, undefined, 32);
    //console.log("Sign deploy - Blake2b Hash (hex):", Buffer.from(hashed).toString('hex'));

    const sigArray = key.sign(hashed, { canonical: true }).toDER();
    const sig = Uint8Array.from(sigArray);
    //console.log("Sign deploy - Signature (DER hex) [" + sig.length + " bytes]:", Buffer.from(sig).toString('hex'));

    const deployerHex = key.getPublic().encode('hex', false);
    //console.log("Sign deploy - Public Key (hex) [" + deployerHex.length / 2 + " bytes]:", deployerHex);
    const deployer = Uint8Array.from(Buffer.from(deployerHex, 'hex'));

    return {
        term, timestamp, phloLimit, phloPrice, validAfterBlockNumber, shardId,
        sigAlgorithm, deployer, sig
    };
};

export const verifyDeploy = (deployObj: DeploySignedProto) => {
    const {
        term, timestamp, phloLimit, phloPrice, validAfterBlockNumber, shardId,
        sigAlgorithm, deployer, sig,
    } = deployObj;

    // console.log("VerifyDeploy - DeployDataProto (pre-serialization):");
    // console.log("  term:", term);
    // console.log("  timestamp:", timestamp);
    // console.log("  phloPrice:", phloPrice);
    // console.log("  phloLimit:", phloLimit);
    // console.log("  shardId:", shardId);
    // console.log("  validAfterBlockNumber:", validAfterBlockNumber);
    // console.log("  sigAlgorithm:", sigAlgorithm);
    // console.log("  deployer:", Buffer.from(deployer).toString('hex'));
    // console.log("  sig:", Buffer.from(sig).toString('hex'));

    const deploySerialized = deployDataProtobufSerialize({
        term, timestamp, phloLimit, phloPrice, validAfterBlockNumber, shardId
    });

    const crypt = new ec(sigAlgorithm);
    const key = crypt.keyFromPublic(deployer);
    const hashed = blake2b(deploySerialized, undefined, 32);
    return key.verify(hashed, sig);
};


export const grpcClient = {
    lastFinalizedBlock: () => callGrpcMethod(deployClient, 'lastFinalizedBlock'),
    doDeploy: (deployData: DeploySignedProto) => callGrpcMethod(deployClient, 'doDeploy', deployData),
    propose: () => callGrpcMethod(proposeClient, 'propose'),
    isFinalized: (query: object) => callGrpcMethod(deployClient, 'isFinalized', query),
    //findDeploy: (query: object) => callGrpcMethod(deployClient, 'findDeploy', query),
    //listenForDataAtName: (query: object) => callGrpcMethod(deployClient, 'listenForDataAtName', query),
    //getBlocks: (query: object) => callGrpcMethod(deployClient, 'getBlocks', query),
};

function callGrpcMethod(client: any, method: string, requestData: object = {}) {
    return new Promise((resolve, reject) => {
        if (!client[method]) {
            return reject(new Error(`Method ${method} not found on f1r3fly client`));
        }
        client[method](requestData, (error: any, response: any) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
}

function deployDataProtobufSerialize(deployData: UnsignedDeployData) {
    const {term, timestamp, phloLimit, phloPrice, validAfterBlockNumber, shardId} = deployData;
    const writer = new BinaryWriter();

    const writeString = (order: number, val: string) => val != "" && writer.writeString(order, val);
    const writeInt64  = (order: number, val: number) => val != 0  && writer.writeInt64(order, val);

    // Серіалізація полів
    writeString(2, term);
    writeInt64(3, timestamp);
    writeInt64(7, phloPrice);
    writeInt64(8, phloLimit);
    writeInt64(10, validAfterBlockNumber);
    writeString(11, shardId);

    return writer.getResultBuffer();
}


const getSignKey = (crypt: ec, pk: ec.KeyPair | string) =>
    pk && typeof pk != 'string' && pk.sign && pk.sign.constructor == Function ? pk : crypt.keyFromPrivate(pk)
