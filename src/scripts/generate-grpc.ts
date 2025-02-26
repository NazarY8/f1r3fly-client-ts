import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

const PROTO_DIR = path.join(process.cwd(), 'src/protos');
const OUTPUT_DIR = path.join(process.cwd(), 'src/generated');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const command = `
  npx grpc_tools_node_protoc \
  --js_out=import_style=commonjs,binary:${OUTPUT_DIR} \
  -I ${PROTO_DIR} \
  -I ${PROTO_DIR}/scalapb \
  -I ${PROTO_DIR}/google/protobuf \
  ${PROTO_DIR}/*.proto \
  ${PROTO_DIR}/scalapb/*.proto
`;

console.log("🔹 Generating gRPC client...");
execSync(command, { stdio: 'inherit' });
console.log("✅ gRPC client generated successfully.");