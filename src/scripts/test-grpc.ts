import { grpcClient, signDeploy, UnsignedDeployData, verifyDeploy } from "../grpc/client";

export default grpcClient;

(async () => {
    try {
        console.log('🔹 Fetching Last Finalized Block...');
        const lastBlock = await grpcClient.lastFinalizedBlock();
        console.log('✅ Last Finalized Block:', lastBlock);

        const rholangCode = `
            new helloWorld, stdout(\`rho:io:stdout\`), stdoutAck(\`rho:io:stdoutAck\`) in {
              contract helloWorld(@name) = {
                new ack in {
                  stdoutAck!("Hello, ", *ack) |
                  for (_ <- ack) {
                    stdoutAck!(name, *ack) |
                    for (_ <- ack) {
                      stdout!("\\n")
                    }
                  }
                }
              } |
              helloWorld!("World!!")
            }
        `;

        const privateKey = 'a8cf01d889cc6ef3119ecbd57301036a52c41ae6e44964e098cb2aefa4598954';
        const deployData: UnsignedDeployData = {
            term: rholangCode,
            timestamp: Date.now(),
            phloPrice: 1,
            phloLimit: 50000,
            validAfterBlockNumber: 0,
            shardId: 'root',
        };

        console.log('🟡 Signing Deploy...');
        const signedDeploy = signDeploy(privateKey, deployData);
        console.log('✅ SIGNED DEPLOY:', JSON.stringify(signedDeploy, null, 2));

        const isValidDeploy = verifyDeploy(signedDeploy);
        console.log(`✅ DEPLOY IS VALID: ${isValidDeploy ? "✔️" : "❌"}`);

        console.log("📤 Перед відправкою (новий клієнт):", JSON.stringify(signedDeploy, null, 2));

        const deployResponse = await grpcClient.doDeploy(signedDeploy) as { result?: string; error?: { messages: string[] } };

        if (deployResponse.result) {
            console.log("✅ DEPLOY RESPONSE Success!", deployResponse.result);
        } else if (deployResponse.error) {
            console.error("❌ DEPLOY ERROR:", deployResponse.error.messages);
            return;
        }

        console.log('🟡 Proposing new block...');
        const proposeResponse = await grpcClient.propose() as { result?: string; error?: { messagesList?: string[] } };

        console.log("🔹 Full propose response:", proposeResponse);

        if (proposeResponse.error && Array.isArray(proposeResponse.error.messagesList)) {
            const errorMessage = proposeResponse.error.messagesList.join("\n");
            console.error("🚨 Propose failed with error:", errorMessage);
            throw new Error(`Propose failed: ${errorMessage}`);
        }

        const proposeRes = proposeResponse.result;
        if (!proposeRes || proposeRes.trim() === "") {
            throw new Error("Propose failed: Empty response");
        }

        console.log("✅ PROPOSE RESPONSE", proposeRes);

        // 🔹 Отримуємо хеш блоку, якщо він є в відповіді
        const match = proposeRes.match(/Success! Block (\w+) created and added\./);
        if (!match) {
            throw new Error("Propose did not return a valid block hash.");
        }

        const blockHash = match[1];
        console.log("🔹 Extracted block hash:", blockHash);

        // 🔹 Додаємо перевірку фіналізації
        const finalizeResponse = await grpcClient.isFinalized({ hash: blockHash }) as { isFinalized?: boolean };

        if (!finalizeResponse.isFinalized) {
            console.log("❌ Deploy is NOT finalized yet.");
            throw new Error(`Block ${blockHash} is not finalized.`);
        }

        console.log("🚀 ✅ Deploy is finalized! 🚀");

    } catch (error) {
        console.error('❌ gRPC Error:', error);
    }
})();
