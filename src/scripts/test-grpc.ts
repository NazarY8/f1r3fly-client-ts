import {grpcClient, signDeploy, verifyDeploy} from "../grpc/client";
import {DeployDataProto} from "../../generated/CasperMessage_pb.js";
import {ProposeQuery} from "../../generated/ProposeServiceCommon_pb.js";
import {DataAtNameByBlockQuery, DataAtNameQuery, IsFinalizedQuery} from "../../generated/DeployServiceCommon_pb.js";
import {
    DeployResponse,
    IsFinalizedResponse,
    ListeningNameDataResponse,
    RhoDataResponse
} from "../../generated/DeployServiceV1_pb.js";
import {Expr, Par} from "../../generated/RhoTypes_pb";
import {ProposeResponse} from "../../generated/ProposeServiceV1_pb";

(async () => {
    try {
        console.log('🔹 Fetching Last Finalized Block...');
        const lastBlock = await grpcClient.lastFinalizedBlock();
        console.log('✅ Last Finalized Block:', lastBlock.toObject());

        const rholangCode = `@"channelName"!("again hey")| new out(\`rho:io:stdout\`) in { out!("Nodejs deploy test") }`;

        const privateKey = '2bdb72a06bacbf46bbfec8f76af6b7bf85de0f297874683b08f9a51196600460';

        const deployData = new DeployDataProto();
        deployData.setTerm(rholangCode);
        deployData.setTimestamp(Date.now());
        deployData.setPhloprice(1);
        deployData.setPhlolimit(50000);
        deployData.setValidafterblocknumber(0);
        deployData.setShardid('root');

        console.log('🟡 Signing Deploy...');
        const signedDeploy: DeployDataProto = signDeploy(privateKey, deployData);
        console.log('✅ SIGNED DEPLOY:', JSON.stringify(signedDeploy, null, 2));

        const isValidDeploy = verifyDeploy(signedDeploy);
        console.log(`✅ DEPLOY IS VALID: ${isValidDeploy ? "✔️" : "❌"}`);

        const deployResponse: DeployResponse = await grpcClient.doDeploy(signedDeploy)

        if (deployResponse.getResult()) {
            console.log("✅ DEPLOY RESPONSE Success!", deployResponse.getResult());
        } else if (deployResponse.getError()) {
            console.error("❌ DEPLOY ERROR:", deployResponse.getError());
            return;
        }

        console.log('🟡 Proposing new block...');

        const proposeQuery: ProposeQuery = new ProposeQuery();
        const proposeResponse: ProposeResponse = await grpcClient.propose(proposeQuery)

        console.log("🔹 Full propose response:", proposeResponse.toObject());

        if (proposeResponse.hasError() && Array.isArray(proposeResponse.hasError())) {
            const errorMessage = proposeResponse.hasError()
            console.error("🚨 Propose failed with error:", errorMessage);
            throw new Error(`Propose failed: ${errorMessage}`);
        }

        const proposeRes = proposeResponse.getResult();
        if (!proposeRes || proposeRes.trim() === "") {
            throw new Error("Propose failed: Empty response");
        }

        console.log("✅ PROPOSE RESPONSE", proposeRes);

        const match = proposeRes.match(/Success! Block (\w+) created and added\./);
        if (!match) {
            throw new Error("Propose did not return a valid block hash.");
        }

        const blockHash = match[1];
        console.log("🔹 Extracted block hash:", blockHash);

        const finalizeQuery = new IsFinalizedQuery();
        finalizeQuery.setHash(blockHash);
        const finalizeResponse: IsFinalizedResponse = await grpcClient.isFinalized(finalizeQuery)

        if (!finalizeResponse.getIsfinalized()) {
            console.log("❌ Deploy is NOT finalized yet.");
            throw new Error(`Block ${blockHash} is not finalized.`);
        }

        console.log("🚀 ✅ Deploy is finalized! 🚀");


        // TODO HOW TO FETCH SOME DATA BY CHANNEL NAME (needed concrete block)
        const par = new Par;
        const expr = new Expr();
        expr.setGString('channelName');

        par.addExprs(expr)
        var query = new DataAtNameByBlockQuery();
        query.setPar(par)
        query.setBlockhash(blockHash)
        query.setUseprestatehash(false)

        console.log("🔹 Query structure:", JSON.stringify(query.toObject(), null, 2));

        const dataAtNameResponse: RhoDataResponse = await grpcClient.getDataAtName(query)

        if (dataAtNameResponse.hasError()) {
            console.error("❌ Error fetching data at name:", dataAtNameResponse.getError()?.toObject());
        } else {
            console.log("✅ All data from channel", dataAtNameResponse.getPayload()?.getParList().map((par) => par.toObject()))
            var dataFromChannel = dataAtNameResponse.getPayload()?.getParList() || [];
            console.log("✅ Last messages:", extractGStringFromParList(dataFromChannel));
        }

        //TODO how to fetch data without block
        var listenQuery = new DataAtNameQuery()
        listenQuery.setDepth(10)
        listenQuery.setName(par)

        const dataAtListenNameResponse: ListeningNameDataResponse = await grpcClient.listenForDataAtName(listenQuery)

        if (dataAtListenNameResponse.hasError()) {
            console.error("❌ Error fetching data at listen name:", dataAtNameResponse.getError()?.toObject());
        } else {
            var listenDataFromChannel = dataAtListenNameResponse.getPayload()?.getBlockinfoList().at(0)?.getPostblockdataList() || []
            console.log("✅ Listen data by depth: ", extractGStringFromParList(listenDataFromChannel))
        }

        function extractGStringFromParList(parList: Array<Par>) {
            return parList.map((par) => par.toObject()).map((x) => x.exprsList.map((e) => e.gString))
        }

    } catch (error) {
        console.error('❌ gRPC Error:', error);
    }
})();
