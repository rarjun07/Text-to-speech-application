from app.schemas.voice import Voice


def get_voice_catalog() -> list[Voice]:
    return [
        Voice(id="en-female", name="Samantha", language="en-US", gender="Female", style="Clear and warm"),
        Voice(id="en-male", name="Fred", language="en-US", gender="Male", style="Calm and steady"),
        Voice(id="hi-female", name="Lekha", language="hi-IN", gender="Female", style="Natural and expressive"),
        Voice(id="es-female", name="Eddy", language="es-ES", gender="Female", style="Bright and conversational"),
    ]
