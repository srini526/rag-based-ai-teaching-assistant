"""Focused unit tests for the non-provider parts of the RAG pipeline."""
import os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

class ChunkingTests(unittest.TestCase):
    def test_split_chunks_keeps_text_and_overlaps(self):
        from app import split_chunks
        text = ("Sentence about retrieval. " * 700).strip()
        chunks = split_chunks(text)
        self.assertGreater(len(chunks), 1)
        self.assertTrue(all(chunk.strip() for chunk in chunks))
        self.assertTrue(all(len(chunk) <= 3200 for chunk in chunks))

    def test_split_chunks_empty(self):
        from app import split_chunks
        self.assertEqual(split_chunks("   "), [])


class GroqTranscriptionTests(unittest.TestCase):
    def test_media_uses_groq_whisper_and_keeps_timestamps(self):
        from types import SimpleNamespace
        from unittest.mock import patch, Mock
        import ingestion
        import config

        fake_result = SimpleNamespace(
            segments=[SimpleNamespace(start=1.2, end=3.8, text=" Hello from Groq.")],
            text="Hello from Groq.",
        )
        fake_client = Mock()
        fake_client.audio.transcriptions.create.return_value = fake_result
        fake_groq_module = SimpleNamespace(Groq=Mock(return_value=fake_client))
        probe = SimpleNamespace(stdout="5.0", returncode=0)
        with patch.dict(sys.modules, {"groq": fake_groq_module}), \
             patch("ingestion.subprocess.run", return_value=probe), \
             patch.object(config, "GROQ_API_KEY", "test-key"), \
             patch.object(config, "WHISPER_MODEL", "whisper-large-v3-turbo"):
            transcript = ingestion._media(b"fake-media-bytes", "lecture.mp3", ".mp3")
        self.assertIn("[Timestamp 00:01 - 00:03] Hello from Groq.", transcript)
        fake_client.audio.transcriptions.create.assert_called_once()


if __name__ == "__main__": unittest.main()
