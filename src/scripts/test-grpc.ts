import {grpcClient, signDeploy, verifyDeploy} from "../grpc/client";
import {DeployDataProto} from "../../generated/CasperMessage_pb.js";
import {ProposeQuery} from "../../generated/ProposeServiceCommon_pb.js";
import {DataAtNameByBlockQuery, IsFinalizedQuery} from "../../generated/DeployServiceCommon_pb.js";
import {DeployResponse} from "../../generated/DeployServiceV1_pb.js";
import {Expr, Par} from "../../generated/RhoTypes_pb";

(async () => {
    try {
        console.log('🔹 Fetching Last Finalized Block...');
        const lastBlock = await grpcClient.lastFinalizedBlock();
        console.log('✅ Last Finalized Block:', lastBlock.toObject());

        const rholangCode = `@"channelName"!("hey!")`;

        const privateKey = '7244b253599356233fd179a577396dd6336c100b32426fe72e29067e6d9ff261';

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

        const proposeQuery = new ProposeQuery();
        const proposeResponse = await grpcClient.propose(proposeQuery)

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
        const finalizeResponse = await grpcClient.isFinalized(finalizeQuery)

        if (!finalizeResponse.getIsfinalized()) {
            console.log("❌ Deploy is NOT finalized yet.");
            throw new Error(`Block ${blockHash} is not finalized.`);
        }

        console.log("🚀 ✅ Deploy is finalized! 🚀");


        // TODO HOW TO FETCH SOME DATA BY CHANNEL NAME
        const par = new Par;
        const expr = new Expr();
        expr.setGString('channelName')
        par.setExprsList([expr]);
        //par.addExprs(expr);
        var query = new DataAtNameByBlockQuery();

        query.setPar(par)
        query.setBlockhash(blockHash)
        query.setUseprestatehash(false)


        console.log("🔹 Query structure:", JSON.stringify(query.toObject(), null, 2));

        const dataAtNameResponse = await grpcClient.getDataAtName(query)

        if (dataAtNameResponse.hasError()) {
            console.error("❌ Error fetching data at name:", dataAtNameResponse.getError()?.toObject());
        } else {
            console.log("✅ Data at name response:", dataAtNameResponse.getPayload());
        }

    } catch (error) {
        console.error('❌ gRPC Error:', error);
    }
})();
