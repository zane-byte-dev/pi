import { fauxAssistantMessage } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { createHarness } from "../harness.ts";

const openAIExplicitRetryMessage =
	"An error occurred while processing your request. You can retry your request, or contact us through our help center at help.openai.com if the error persists. Please include the request ID req_******** in your message.";
const bedrockExplicitRetryMessage =
	'{"message":"The system encountered an unexpected error during processing. Try your request again."}';
const bedrockUnableToProcessMessage = "Bedrock is unable to process your request.";

describe("regression: provider retry messages", () => {
	it.each([
		["openai", openAIExplicitRetryMessage],
		["bedrock", bedrockExplicitRetryMessage],
		["bedrock opaque transient failure", bedrockUnableToProcessMessage],
	])("retries %s transient failures", async (_provider, errorMessage) => {
		const harness = await createHarness({ settings: { retry: { enabled: true, maxRetries: 3, baseDelayMs: 1 } } });
		try {
			harness.setResponses([
				fauxAssistantMessage("", { stopReason: "error", errorMessage }),
				fauxAssistantMessage("recovered"),
			]);

			await harness.session.prompt("test");

			expect(harness.faux.state.callCount).toBe(2);
			expect(harness.eventsOfType("auto_retry_start").map((event) => event.errorMessage)).toEqual([errorMessage]);
			expect(harness.eventsOfType("auto_retry_end").map((event) => event.success)).toEqual([true]);
		} finally {
			harness.cleanup();
		}
	});
});
