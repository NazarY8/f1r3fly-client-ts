import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

const PROTO_DIR = path.join(process.cwd(), 'protos');
const OUTPUT_DIR = path.join(process.cwd(), 'generated');

// Ensure the output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Command to generate .ts and .js files for all .proto files, including gRPC service clients
const pbCommand = `
  npx grpc_tools_node_protoc \
  --plugin=protoc-gen-ts=$(which protoc-gen-ts) \
  --ts_out=service=grpc-node,mode=grpcjs:${OUTPUT_DIR} \
  --js_out=import_style=commonjs,binary:${OUTPUT_DIR} \
  -I ${PROTO_DIR} \
  -I ${PROTO_DIR}/scalapb \
  -I ${PROTO_DIR}/google/protobuf \
  ${PROTO_DIR}/*.proto \
  ${PROTO_DIR}/scalapb/*.proto
`;

console.log("🔹 Generating ts and js files for all gRPC services...");
execSync(pbCommand, { stdio: 'inherit' });
console.log("✅ ts and js files generated successfully.");

// Command to generate specific gRPC TypeScript and JavaScript files for DeployServiceV1 and ProposeServiceV1
const grpcCommand = `
  npx grpc_tools_node_protoc \
  --plugin=protoc-gen-ts=$(which protoc-gen-ts) \
  --ts_out=service=grpc-node,mode=grpcjs:${OUTPUT_DIR} \
  --js_out=import_style=commonjs,binary:${OUTPUT_DIR} \
  --grpc_out=grpc_js:${OUTPUT_DIR} \
  -I ${PROTO_DIR} \
  ${PROTO_DIR}/DeployServiceV1.proto \
  ${PROTO_DIR}/ProposeServiceV1.proto
`;

console.log("🔹 Generating grpc.ts and grpc.js files for Deploy and Propose services...");
execSync(grpcCommand, { stdio: 'inherit' });
console.log("✅ grpc.ts and grpc.js files generated successfully.");

// //TODO IDK why, but inside --> 'DeployServiceV1_grpc_pb.d.ts', 'ProposeServiceV1_grpc_pb.d.ts' we have gprc library which is deprecated, but should have @grpc/grpc-js

// Path to the generated files
const GENERATED_DIR = path.join(process.cwd(), 'generated');

// Define the files that need to be modified
const filesToModify = [
    'DeployServiceV1_grpc_pb.d.ts',
    'ProposeServiceV1_grpc_pb.d.ts'
];

//Function to replace "grpc" import in specific .d.ts files
function replaceGrpcImport() {
    filesToModify.forEach((fileName) => {
        const filePath = path.join(GENERATED_DIR, fileName);

        // Check if the file exists
        if (fs.existsSync(filePath)) {
            // Read the file content
            let content = fs.readFileSync(filePath, 'utf-8');
            // Replace grpc import from "grpc" to "@grpc/grpc-js"
            if (content.includes('import * as grpc from "grpc";')) {
                content = content.replace('import * as grpc from "grpc";', 'import * as grpc from "@grpc/grpc-js";');

                // Write the modified content back to the file
                fs.writeFileSync(filePath, content);
                console.log(`✅ Updated in grpc_pb.d.ts grpc import in ${fileName}`);
            }
        } else {
            console.log(`❌ File not found: ${fileName}`);
        }
    });
}


// Run the function to replace grpc imports in specific files
replaceGrpcImport();

const secondFilesToModify = [
    'DeployServiceV1_grpc_pb.js',
    'ProposeServiceV1_grpc_pb.js'
];

// Function to replace "grpc" require in specific .js files
function replaceGrpcRequire() {
    secondFilesToModify.forEach((fileName) => {
        const filePath = path.join(GENERATED_DIR, fileName);

        // Check if the file exists
        if (fs.existsSync(filePath)) {
            // Read the file content
            let content = fs.readFileSync(filePath, 'utf-8');

            // Replace grpc require from 'grpc' to '@grpc/grpc-js'
            if (content.includes("var grpc = require('grpc');")) {
                content = content.replace("var grpc = require('grpc');", "var grpc = require('@grpc/grpc-js');");

                // Write the modified content back to the file
                fs.writeFileSync(filePath, content);
                console.log(`✅ Updated grpc require in ${fileName}`);
            }
        } else {
            console.log(`❌ File not found: ${fileName}`);
        }
    });
}

// Run the function to replace grpc requires in specific files
replaceGrpcRequire();

async function addFixExprPrimitiveFields(jsPath: string) {
    const rhoTypesJs = path.resolve(jsPath, 'RhoTypes_pb.js');

    const patch = `
/**
 * Fix for primitive fields in Expr type.
 * https://github.com/rchain/rchain/issues/3566
 *
 * RNode uses protobuf v3 format which doesn't serialize default values for primitive types.
 * RNode overrides this behavior for Rholang types, so fields with primitive values are
 * always serialized, even containing default values.
 * JS generated code with grpc-tools will set default values for not serialized fields which
 * makes it impossible to detect in Expr type which field is really set.
 * This fix detects non-serialized fields of Expr type and sets them to undefined.
 */
const originExprToObject = proto.rhoapi.Expr.toObject;

const patchFields = [
  ['gBool'     ,  1],
  ['gInt'      ,  2],
  ['gString'   ,  3],
  ['gUri'      ,  4],
  ['gByteArray', 25],
];

function deleteFieldIfEmpty(msg, exprObj, name, fieldNr) {
  const v = jspb.Message.getField(msg, fieldNr);
  if (v === void 666 || v === null) exprObj[name] = void 666;
}

proto.rhoapi.Expr.toObject = function(includeInstance, msg) {
  const expr = originExprToObject.call(includeInstance, includeInstance, msg);
  patchFields.forEach(([name, pos]) => deleteFieldIfEmpty(msg, expr, name, pos));
  return expr;
};
`;

    try {
        // Check if the RhoTypes_pb.js file exists
        if (fs.existsSync(rhoTypesJs)) {
            // Append the patch to the file
            await fs.appendFile(rhoTypesJs, patch, 'utf8');
            console.log("✅ Successfully patched RhoTypes_pb.js with Expr field fix.");
        } else {
            console.log(`❌ File not found: ${rhoTypesJs}`);
        }
    } catch (error) {
        console.error("❌ Error while patching RhoTypes_pb.js:", error);
    }
}

// Call the function to patch the file
addFixExprPrimitiveFields('generated')
    .then(() => console.log("Patch process complete."))
    .catch((error) => console.error("Patch process failed:", error));


