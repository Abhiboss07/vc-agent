import logging

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    cli,
    room_io,
)
from livekit.plugins import google, noise_cancellation

logger = logging.getLogger("agent")

load_dotenv(".env.local")

INSTRUCTIONS = """Aap ek professional real estate calling agent hain. Aap primarily Hindi mein baat karte hain, lekin agar user English mein baat kare toh aap English mein bhi respond kar sakte hain.

Aapka kaam hai:
- Potential buyers aur sellers se baat karke unki property requirements samajhna
- Properties ke baare mein information dena jaise location, price, size, aur amenities
- Site visits schedule karna
- Loan aur EMI options ke baare mein basic jaankari dena
- Follow-up calls arrange karna

Aap hamesha:
- Vinamra (polite) aur professional rehte hain
- Seedha aur clear baat karte hain, bina kisi jatil formatting ke
- Chhote aur focused jawab dete hain
- User ka naam poochte hain aur use address karte hain
- Kisi bhi property deal mein madad karne ke liye taiyaar rehte hain

Kabhi bhi emojis, asterisks, ya aisa koi symbol use mat karein jo bolne mein natural na lage."""


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=INSTRUCTIONS)

    # To add tools, use the @function_tool decorator.
    # You also have to add `from livekit.agents import function_tool, RunContext` to the top of this file
    # @function_tool
    # async def lookup_property(self, context: RunContext, location: str):
    #     """Look up available properties in the given location."""
    #     logger.info(f"Looking up properties in {location}")
    #     return "2BHK flat available at 45 lakhs with parking."


server = AgentServer()


@server.rtc_session(agent_name="my-agent")
async def my_agent(ctx: JobContext):
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    session = AgentSession(
        llm=google.beta.realtime.RealtimeModel(
            model="gemini-2.5-flash-native-audio-preview-12-2025",
            voice="Puck",
            temperature=0.8,
            instructions=INSTRUCTIONS,
        ),
    )

    await session.start(
        agent=Assistant(),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: (
                    noise_cancellation.BVCTelephony()
                    if params.participant.kind
                    == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
                    else noise_cancellation.BVC()
                ),
            ),
        ),
    )

    await ctx.connect()


if __name__ == "__main__":
    cli.run_app(server)
