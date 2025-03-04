import {ServiceError} from "@grpc/grpc-js";

import * as grpc from '@grpc/grpc-js';
import {ec} from 'elliptic';
import {blake2b} from 'blakejs';
import {BinaryWriter} from 'google-protobuf';

import {
    DataAtNameByBlockQuery,
    IsFinalizedQuery,
    LastFinalizedBlockQuery
} from "../../generated/DeployServiceCommon_pb.js";

import {
    DeployResponse,
    IsFinalizedResponse,
    LastFinalizedBlockResponse,
    RhoDataResponse
} from "../../generated/DeployServiceV1_pb.js";
import {ProposeResponse} from "../../generated/ProposeServiceV1_pb.js";

import {DeployDataProto} from "../../generated/CasperMessage_pb.js";
import {DeployServiceClient} from "../../generated/DeployServiceV1_grpc_pb.js";
import {ProposeServiceClient} from "../../generated/ProposeServiceV1_grpc_pb.js";
import {ProposeQuery} from "../../generated/ProposeServiceCommon_pb";


const deployClient: DeployServiceClient = new DeployServiceClient('localhost:40401', grpc.credentials.createInsecure());
const proposeClient: ProposeServiceClient = new ProposeServiceClient('localhost:40402', grpc.credentials.createInsecure());


//asi dev env
//const deployClient : DeployServiceClient= new DeployServiceClient('146.235.215.215:30001', grpc.credentials.createInsecure());
//const proposeClient : = new ProposeServiceClient('146.235.215.215:30002', grpc.credentials.createInsecure());

console.log("🔹 Available gRPC methods for deployServiceClient:", Object.keys(deployClient));
console.log("🔹 Available gRPC methods for proposeServiceClient:", Object.keys(proposeClient));


export const signDeploy = function (privateKey: ec.KeyPair | string, deployObj: DeployDataProto): DeployDataProto {
    const {
        term,
        timestamp,
        phlolimit,
        phloprice,
        validafterblocknumber,
        shardid,
        sigalgorithm
    } = deployObj.toObject();

    const crypt = new ec('secp256k1');

    const key = getSignKey(crypt, privateKey);

    const deployData = new DeployDataProto();
    deployData.setTerm(term);
    deployData.setTimestamp(timestamp);
    deployData.setPhlolimit(phlolimit);
    deployData.setPhloprice(phloprice);
    deployData.setValidafterblocknumber(validafterblocknumber);
    deployData.setShardid(shardid);

    const deploySerialized = deployDataProtobufSerialize(deployData);
    const hashed = blake2b(deploySerialized, undefined, 32);

    const sigArray = key.sign(hashed, {canonical: true}).toDER();
    const sig = Uint8Array.from(sigArray);

    const deployerHex = key.getPublic().encode('hex', false);
    const deployer = Uint8Array.from(Buffer.from(deployerHex, 'hex'));

    deployData.setSigalgorithm('secp256k1');
    deployData.setDeployer(deployer);
    deployData.setSig(sig);

    return deployData;
};

//TODO should be fixed, something with verifier => string not array

// export const verifyDeploy = (deployObj: DeployDataProto) => {
//     const {
//         term, timestamp, phlolimit, phloprice, validafterblocknumber, shardid,
//         sigalgorithm, deployer, sig,
//     } = deployObj.toObject();
//
//     console.log("verify to object", deployObj.toObject())
//     const deployData = new DeployDataProto();
//     deployData.setTerm(term);
//     deployData.setTimestamp(timestamp);
//     deployData.setPhlolimit(phlolimit);
//     deployData.setPhloprice(phloprice);
//     deployData.setValidafterblocknumber(validafterblocknumber);
//     deployData.setShardid(shardid);
//
//     if(typeof deployer==="string") {
//         console.log("deployer string ")
//         console.log(deployer)
//     }
//     const upd_deployer = Buffer.from(deployer as string, "base64")
//     console.log("upd_deployer: ", upd_deployer)
//     // console.log("  deployer:", Buffer.from(deployer).toString('hex'));
//     // console.log("  sig:", Buffer.from(sig).toString('hex'));
//     const deploySerialized = deployDataProtobufSerialize(deployData);
//     const crypt = new ec(sigalgorithm);
//     // console.log("verify crypt: ", sigalgorithm)
//     const key = crypt.keyFromPublic(upd_deployer);
//     const hashed = blake2b(deploySerialized, undefined, 32);
//     return key.verify(hashed, sig);
// };


export const grpcClient = {
    lastFinalizedBlock: async (): Promise<LastFinalizedBlockResponse> => {
        return new Promise((resolve, reject) => {
            const query = new LastFinalizedBlockQuery();
            deployClient.lastFinalizedBlock(query, (error: ServiceError | null, response: LastFinalizedBlockResponse) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            });
        });
    },

    doDeploy: async (deployData: DeployDataProto): Promise<DeployResponse> => {
        return new Promise((resolve, reject) => {
            deployClient.doDeploy(deployData, (error: ServiceError | null, response: DeployResponse) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            });
        });
    },

    propose: async (proposeQuery: ProposeQuery): Promise<ProposeResponse> => {
        return new Promise((resolve, reject) => {
            proposeClient.propose(proposeQuery, (error: ServiceError | null, response: ProposeResponse) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            });
        });
    },

    isFinalized: async (query: IsFinalizedQuery): Promise<IsFinalizedResponse> => {
        return new Promise((resolve, reject) => {
            deployClient.isFinalized(query, (error: ServiceError | null, response: IsFinalizedResponse) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            });
        });
    },

    getDataAtName: async (query: DataAtNameByBlockQuery): Promise<RhoDataResponse> => {
        return new Promise((resolve, reject) => {
            deployClient.getDataAtName(query, (error: ServiceError | null, response: RhoDataResponse) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            });
        });
    }
};


function deployDataProtobufSerialize(deployData: DeployDataProto) {
    const {term, timestamp, phlolimit, phloprice, validafterblocknumber, shardid} = deployData.toObject();
    const writer = new BinaryWriter();

    const writeString = (order: number, val: string) => val !== "" && writer.writeString(order, val);
    const writeInt64 = (order: number, val: number) => val !== 0 && writer.writeInt64(order, val);

    writeString(2, term);
    writeInt64(3, timestamp);
    writeInt64(7, phloprice);
    writeInt64(8, phlolimit);
    writeInt64(10, validafterblocknumber);
    writeString(11, shardid);

    return writer.getResultBuffer();
}


const getSignKey = (crypt: ec, pk: ec.KeyPair | string) =>
    pk && typeof pk != 'string' && pk.sign && pk.sign.constructor == Function ? pk : crypt.keyFromPrivate(pk)
