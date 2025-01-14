import { MoonstreamWeb3ProviderInterface } from "../types/Moonstream";
import { AbiItem } from "web3-utils";
import { getMulticallContract } from "./getWeb3Contracts";

export async function getMulticallResults(
  web3ctx: MoonstreamWeb3ProviderInterface,
  ABI: AbiItem[],
  functionNames: string[],
  queries: { target: string; callData: string }[],
): Promise<any[][]> {
  function splitArray(arr: [boolean, string][], n: number): string[][] {
    const result = Array.from({ length: n }, (): string[] => []);
    for (let i = 0; i < arr.length; i++) {
      result[i % n].push(arr[i][1]);
    }
    return result;
  }

  const multicallContract = getMulticallContract(web3ctx);
  const result = [];
  const response = await multicallContract.methods.tryAggregate(false, queries).call();
  const splitResponses = splitArray(response, functionNames.length);

  for (let i = 0; i < functionNames.length; i++) {
    const functionName = functionNames[i];
    const functionABI = ABI.find((item) => item.name === functionName && item.type === "function");
    const outputs = functionABI?.outputs;
    if (!outputs) {
      throw new Error(`Function ${functionName} not found in ABI or does not have outputs.`);
    }

    const decodedResults = splitResponses[i].map((result) => {
      if (result === undefined) {
        return undefined;
      }
      const decoded = web3ctx.web3.eth.abi.decodeParameters(outputs, result);
      if (outputs.length === 1 && outputs[0].type !== "tuple") {
        // If the output is a primitive type, return the primitive value
        return decoded[Object.keys(decoded)[0]]; // Extract the first (and only) parameter
      } else {
        return decoded;
      }
    });
    result.push(decodedResults);
  }
  return result;
}
