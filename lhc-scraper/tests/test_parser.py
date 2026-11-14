from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scraper import is_lhc_pdf_url, parse_judgments  # noqa: E402

FIXTURE = Path(__file__).parent / "fixtures" / "listing_sample.html"
SOURCE_URL = "https://data.lhc.gov.pk/reported_judgments/judgments_approved_for_reporting"


class PdfUrlValidationTest(unittest.TestCase):
    def test_only_https_pdf_urls_on_lhc_domains_are_accepted(self) -> None:
        self.assertTrue(
            is_lhc_pdf_url("https://sys.lhc.gov.pk/appjudgments/2026LHC8777.pdf")
        )
        self.assertTrue(
            is_lhc_pdf_url("http://lhc.gov.pk/appjudgments/2026LHC8777.pdf")
        )
        self.assertFalse(
            is_lhc_pdf_url("https://evil-lhc.gov.pk/appjudgments/2026LHC8777.pdf")
        )
        self.assertFalse(
            is_lhc_pdf_url("https://sys.lhc.gov.pk/appjudgments/2026LHC8777.html")
        )
        self.assertFalse(
            is_lhc_pdf_url("https://example.com/appjudgments/2026LHC8777.pdf")
        )


class ParseJudgmentsTest(unittest.TestCase):
    def setUp(self) -> None:
        html = FIXTURE.read_text(encoding="utf-8")
        self.records, self.total_rows, self.skipped = parse_judgments(html, SOURCE_URL)

    def test_rows_are_parsed_and_empty_row_is_ignored(self) -> None:
        self.assertEqual(self.total_rows, 5)
        self.assertEqual(len(self.records), 4)
        self.assertEqual(self.skipped, 0)

    def test_row_without_tagline(self) -> None:
        record = self.records[0]

        self.assertEqual(record.court, "LHC")
        self.assertEqual(record.case_type, "Regular First Appeal (R.F.A) (Final Decree)")
        self.assertEqual(record.case_number, "21229/26")
        self.assertEqual(record.title, "Muhammad Irfan Vs Muhammad Akram")
        self.assertEqual(record.judges, "Mr. Justice Muhammad Sajid Mehmood Sethi")
        self.assertIsNone(record.tag_line)
        self.assertIsNone(record.decision_date)
        self.assertEqual(record.uploaded_on, "2026-11-13")
        self.assertEqual(
            record.pdf_path, "https://sys.lhc.gov.pk/appjudgments/2026LHC8787.pdf"
        )
        self.assertEqual(record.source_url, SOURCE_URL)
        self.assertTrue(record.slug.startswith("lhc-"))
        self.assertTrue(record.is_published)

    def test_row_with_tagline(self) -> None:
        record = self.records[1]

        self.assertEqual(record.case_type, "Writ Petition-Civil Proceedings-Rent")
        self.assertEqual(record.case_number, "6712-26")
        self.assertEqual(record.title, "HABIB ULLAH VS ADJ ETC")
        self.assertEqual(record.judges, "Mr. Justice Syed Ahsan Raza Kazmi")
        self.assertTrue(record.tag_line.startswith("The mere fact that the ownership"))
        self.assertEqual(record.uploaded_on, "2026-11-13")

    def test_bold_vs_inside_title_does_not_become_the_judge(self) -> None:
        record = self.records[2]

        self.assertEqual(
            record.case_type, "Writ Petition-Miscellaneous-Consumer Courts"
        )
        self.assertEqual(record.case_number, "14044-26")
        self.assertEqual(
            record.title,
            "UNITED INSURANCE COMPANY THR. RIZWAN SAFDAR VS DR. ASMA MALIK ETC",
        )
        self.assertEqual(record.judges, "Mr. Justice Jawad Hassan")
        self.assertIsNone(record.tag_line)

    def test_nested_parentheses_in_title_are_kept(self) -> None:
        record = self.records[3]

        self.assertEqual(record.case_type, "Civil Revision")
        self.assertEqual(record.case_number, "8852/25")
        self.assertEqual(
            record.title,
            "Muhammad Usman Vs National Database & Registration Authority (NADRA) through Chairman NSRC Isd etc",
        )
        self.assertEqual(record.uploaded_on, "2026-10-30")
        self.assertTrue(record.tag_line.startswith("A suit cannot be dismissed"))


if __name__ == "__main__":
    unittest.main()
