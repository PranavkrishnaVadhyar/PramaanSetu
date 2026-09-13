
"""
PRAMAANSETU - CONNECTED SYNTHETIC ID DATASET GENERATOR
=======================================================

Creates synthetic identity-document datasets for testing
PramaanSetu's:

    - OCR
    - document validation
    - tamper detection
    - face verification
    - cross-document identity correlation
    - risk scoring

IMPORTANT:
These are fictional TEST documents.
They are NOT Aadhaar, PAN cards, passports, or government IDs.

Each person gets one folder containing documents that share
the same synthetic identity attributes.

Output structure:

synthetic_connected_ids/
│
├── person_001/
│   ├── identity.json
│   ├── aadhaar_test.png
│   ├── passport_test.png
│   ├── pan_test.png
│   ├── passport_tampered.png
│   └── pan_tampered.png
│
├── person_002/
│   ├── identity.json
│   ├── aadhaar_test.png
│   ├── passport_test.png
│   ├── pan_test.png
│   └── ...
│
└── dataset_manifest.csv

Install:

pip install pillow faker qrcode opencv-python
"""

from pathlib import Path
from datetime import date, timedelta
import csv
import json
import random
import string
import hashlib

from PIL import Image, ImageDraw, ImageFont, ImageFilter
from faker import Faker
import qrcode


# ============================================================
# CONFIGURATION
# ============================================================

NUM_PEOPLE = 50

OUTPUT_DIR = Path("synthetic_connected_ids")

# Same dimensions as the previous generator
WIDTH = 1200
HEIGHT = 760

random.seed(42)
fake = Faker("en_IN")

FONT_DIR = Path("C:/Windows/Fonts")


# ============================================================
# FONTS
# ============================================================

def get_font(size, bold=False):

    if bold:
        candidates = [
            FONT_DIR / "arialbd.ttf",
            FONT_DIR / "segoeuib.ttf",
        ]
    else:
        candidates = [
            FONT_DIR / "arial.ttf",
            FONT_DIR / "segoeui.ttf",
        ]

    for font in candidates:
        if font.exists():
            return ImageFont.truetype(str(font), size)

    return ImageFont.load_default()


FONT_TITLE = get_font(38, True)
FONT_HEADER = get_font(28, True)
FONT_LABEL = get_font(21, True)
FONT_TEXT = get_font(25)
FONT_SMALL = get_font(18)
FONT_MRZ = get_font(22)


# ============================================================
# GENERAL HELPERS
# ============================================================

def random_digits(length):

    return "".join(
        random.choice(string.digits)
        for _ in range(length)
    )


def random_letters(length):

    return "".join(
        random.choice(string.ascii_uppercase)
        for _ in range(length)
    )


def random_date():

    start = date(1970, 1, 1)
    end = date(2005, 12, 31)

    days = (end - start).days

    return start + timedelta(
        days=random.randint(0, days)
    )


def future_date():

    start = date.today() + timedelta(days=365)

    end = date.today() + timedelta(days=3650)

    days = (end - start).days

    return start + timedelta(
        days=random.randint(0, days)
    )


def rounded_box(draw, box, radius=20, fill=None, outline=(60, 60, 60), width=2):

    draw.rounded_rectangle(
        box,
        radius=radius,
        fill=fill,
        outline=outline,
        width=width,
    )


def add_outer_border(draw):

    draw.rounded_rectangle(
        (10, 10, WIDTH - 10, HEIGHT - 10),
        radius=25,
        outline=(50, 50, 50),
        width=5,
    )


# ============================================================
# SYNTHETIC FACE GENERATION
# ============================================================

def generate_face(seed_text):

    """
    Creates a deterministic fictional face.

    The same seed always produces the same face,
    allowing the same person to have the same face
    across multiple synthetic documents.
    """

    seed = int(
        hashlib.sha256(
            seed_text.encode("utf-8")
        ).hexdigest(),
        16,
    )

    rng = random.Random(seed)

    img = Image.new(
        "RGB",
        (280, 340),
        (220, 220, 220),
    )

    draw = ImageDraw.Draw(img)

    # Background
    bg = (
        rng.randint(185, 235),
        rng.randint(185, 235),
        rng.randint(185, 235),
    )

    draw.rectangle(
        (0, 0, 280, 340),
        fill=bg,
    )

    # Skin
    skin = (
        rng.randint(150, 220),
        rng.randint(100, 180),
        rng.randint(80, 150),
    )

    hair = (
        rng.randint(20, 70),
        rng.randint(20, 70),
        rng.randint(20, 70),
    )

    shirt = (
        rng.randint(40, 100),
        rng.randint(50, 120),
        rng.randint(80, 150),
    )

    # Shoulders
    draw.ellipse(
        (30, 225, 250, 450),
        fill=shirt,
    )

    # Neck
    draw.rectangle(
        (105, 180, 175, 255),
        fill=skin,
    )

    # Face
    draw.ellipse(
        (65, 40, 215, 225),
        fill=skin,
    )

    # Hair
    draw.pieslice(
        (60, 20, 220, 150),
        180,
        360,
        fill=hair,
    )

    # Eyes
    draw.ellipse(
        (95, 110, 110, 125),
        fill=(20, 20, 20),
    )

    draw.ellipse(
        (170, 110, 185, 125),
        fill=(20, 20, 20),
    )

    # Nose
    draw.line(
        (140, 125, 130, 165, 145, 170),
        fill=(100, 70, 60),
        width=3,
    )

    # Mouth
    draw.arc(
        (115, 155, 165, 195),
        0,
        180,
        fill=(90, 30, 30),
        width=3,
    )

    return img


# ============================================================
# QR GENERATION
# ============================================================

def generate_test_qr(identity):

    payload = (
        "PRAMAANSETU-TEST|"
        f"ID={identity['identity_id']}|"
        f"NAME={identity['name']}|"
        f"DOB={identity['dob']}|"
        f"GENDER={identity['gender']}"
    )

    qr = qrcode.QRCode(
        version=3,
        box_size=5,
        border=2,
    )

    qr.add_data(payload)
    qr.make(fit=True)

    return qr.make_image(
        fill_color="black",
        back_color="white",
    ).convert("RGB")


# ============================================================
# IDENTITY GENERATION
# ============================================================

def generate_identity(index):

    first_name = fake.first_name()
    last_name = fake.last_name()

    name = (
        f"{first_name} {last_name}"
    ).upper()

    father_name = (
        fake.first_name_male()
        + " "
        + last_name
    ).upper()

    dob = random_date()

    gender = random.choice(
        ["M", "F"]
    )

    identity_id = (
        f"PS-ID-{index:04d}"
    )

    # Synthetic identifiers.
    # These are deliberately not real government IDs.
    synthetic_resident_id = (
        "TEST-"
        + random_digits(12)
    )

    synthetic_tax_id = (
        random_letters(5)
        + random_digits(4)
        + random_letters(1)
    )

    synthetic_passport_id = (
        "TEST-P-"
        + random_digits(7)
    )

    return {
        "identity_id": identity_id,
        "name": name,
        "father_name": father_name,
        "dob": dob.strftime("%d/%m/%Y"),
        "gender": gender,
        "nationality": "INDIAN",

        "synthetic_resident_id":
            synthetic_resident_id,

        "synthetic_tax_id":
            synthetic_tax_id,

        "synthetic_passport_id":
            synthetic_passport_id,

        "face_seed":
            identity_id,
    }


# ============================================================
# COMMON HEADER
# ============================================================

def draw_header(
    image,
    title,
    subtitle,
):

    draw = ImageDraw.Draw(image)

    add_outer_border(draw)

    draw.rectangle(
        (20, 20, WIDTH - 20, 115),
        fill=(40, 80, 115),
    )

    draw.text(
        (45, 40),
        "PRAMAANSETU TEST AUTHORITY",
        font=FONT_TITLE,
        fill=(255, 255, 255),
    )

    draw.text(
        (45, 130),
        title,
        font=FONT_HEADER,
        fill=(40, 80, 115),
    )

    draw.text(
        (45, 165),
        subtitle,
        font=FONT_SMALL,
        fill=(80, 80, 80),
    )


# ============================================================
# PASSPORT-LIKE TEST DOCUMENT
# ============================================================

def create_passport(identity, output_path):

    image = Image.new(
        "RGB",
        (WIDTH, HEIGHT),
        (245, 248, 252),
    )

    draw_header(
        image,
        "SYNTHETIC TRAVEL ID - TEST",
        "Fictional identity document for software testing",
    )

    draw = ImageDraw.Draw(image)

    fields = [
        ("FULL NAME", identity["name"]),
        (
            "TEST DOCUMENT NUMBER",
            identity["synthetic_passport_id"],
        ),
        (
            "NATIONALITY",
            identity["nationality"],
        ),
        (
            "DATE OF BIRTH",
            identity["dob"],
        ),
        (
            "GENDER",
            identity["gender"],
        ),
        (
            "EXPIRY DATE",
            future_date().strftime("%d/%m/%Y"),
        ),
    ]

    y = 225

    for label, value in fields:

        draw.text(
            (55, y),
            label,
            font=FONT_LABEL,
            fill=(40, 40, 40),
        )

        draw.text(
            (330, y),
            value,
            font=FONT_TEXT,
            fill=(20, 20, 20),
        )

        y += 60

    # Photo
    photo = generate_face(
        identity["face_seed"]
    )

    photo = photo.resize(
        (220, 270)
    )

    image.paste(
        photo,
        (900, 180),
    )

    # Synthetic machine-readable area
    draw.rectangle(
        (45, 590, 1155, 705),
        outline=(90, 90, 90),
        width=2,
    )

    line1 = (
        f"TEST<{identity['name'].replace(' ', '<')}"
    )

    line2 = (
        f"{identity['synthetic_passport_id']}"
        f"<<TEST"
        f"{identity['dob'].replace('/', '')}"
    )

    draw.text(
        (65, 615),
        line1[:72],
        font=FONT_MRZ,
        fill=(20, 20, 20),
    )

    draw.text(
        (65, 655),
        line2[:72],
        font=FONT_MRZ,
        fill=(20, 20, 20),
    )

    image.save(
        output_path,
        quality=95,
    )


# ============================================================
# AADHAAR-LIKE TEST DOCUMENT
# ============================================================

def create_aadhaar(identity, output_path):

    image = Image.new(
        "RGB",
        (WIDTH, HEIGHT),
        (255, 255, 255),
    )

    draw_header(
        image,
        "SYNTHETIC RESIDENT ID - TEST",
        "Fictional resident identity document for testing",
    )

    draw = ImageDraw.Draw(image)

    # Synthetic resident identifier
    uid = identity[
        "synthetic_resident_id"
    ]

    draw.text(
        (55, 220),
        "TEST RESIDENT NUMBER",
        font=FONT_LABEL,
        fill=(50, 50, 50),
    )

    draw.text(
        (55, 260),
        uid,
        font=FONT_HEADER,
        fill=(30, 30, 30),
    )

    fields = [
        ("NAME", identity["name"]),
        ("DATE OF BIRTH", identity["dob"]),
        ("GENDER", identity["gender"]),
        ("NATIONALITY", identity["nationality"]),
        (
            "ADDRESS",
            "123 SYNTHETIC TEST ROAD, KERALA",
        ),
    ]

    y = 340

    for label, value in fields:

        draw.text(
            (55, y),
            label,
            font=FONT_LABEL,
            fill=(50, 50, 50),
        )

        draw.text(
            (290, y),
            value,
            font=FONT_TEXT,
            fill=(20, 20, 20),
        )

        y += 55

    # Photo
    photo = generate_face(
        identity["face_seed"]
    )

    photo = photo.resize(
        (220, 270)
    )

    image.paste(
        photo,
        (900, 155),
    )

    # QR
    qr = generate_test_qr(identity)

    qr = qr.resize(
        (210, 210)
    )

    image.paste(
        qr,
        (900, 465),
    )

    image.save(
        output_path,
        quality=95,
    )


# ============================================================
# PAN-LIKE TEST DOCUMENT
# ============================================================

def create_pan(identity, output_path):

    image = Image.new(
        "RGB",
        (WIDTH, HEIGHT),
        (240, 245, 250),
    )

    draw_header(
        image,
        "SYNTHETIC TAX ID - TEST",
        "Fictional tax identity document for testing",
    )

    draw = ImageDraw.Draw(image)

    fields = [
        (
            "TEST TAX IDENTIFIER",
            identity["synthetic_tax_id"],
        ),
        (
            "NAME",
            identity["name"],
        ),
        (
            "FATHER'S NAME",
            identity["father_name"],
        ),
        (
            "DATE OF BIRTH",
            identity["dob"],
        ),
    ]

    y = 235

    for label, value in fields:

        draw.text(
            (55, y),
            label,
            font=FONT_LABEL,
            fill=(40, 40, 40),
        )

        draw.text(
            (370, y),
            value,
            font=FONT_TEXT,
            fill=(20, 20, 20),
        )

        y += 75

    # Photo
    photo = generate_face(
        identity["face_seed"]
    )

    photo = photo.resize(
        (220, 270)
    )

    image.paste(
        photo,
        (900, 185),
    )

    # Signature
    draw.line(
        (70, 585, 350, 585),
        fill=(50, 50, 50),
        width=3,
    )

    draw.text(
        (70, 605),
        "TEST SIGNATURE",
        font=FONT_SMALL,
        fill=(60, 60, 60),
    )

    image.save(
        output_path,
        quality=95,
    )


# ============================================================
# TAMPERING HELPERS
# ============================================================

def tamper_passport_name(
    source,
    destination,
):

    image = Image.open(source).convert("RGB")

    draw = ImageDraw.Draw(image)

    # Cover original name
    draw.rectangle(
        (320, 220, 820, 265),
        fill=(245, 248, 252),
    )

    draw.text(
        (330, 225),
        "RAHUL KUMAR",
        font=FONT_TEXT,
        fill=(20, 20, 20),
    )

    image.save(
        destination,
        quality=95,
    )


def tamper_pan_name(
    source,
    destination,
):

    image = Image.open(source).convert("RGB")

    draw = ImageDraw.Draw(image)

    draw.rectangle(
        (370, 305, 850, 350),
        fill=(240, 245, 250),
    )

    draw.text(
        (380, 310),
        "RAHUL KUMAR",
        font=FONT_TEXT,
        fill=(20, 20, 20),
    )

    image.save(
        destination,
        quality=95,
    )


def tamper_aadhaar_qr(
    source,
    destination,
):

    image = Image.open(source).convert("RGB")

    qr = generate_test_qr(
        {
            "identity_id": "INVALID",
            "name": "DIFFERENT PERSON",
            "dob": "01/01/1990",
            "gender": "X",
        }
    )

    qr = qr.resize(
        (210, 210)
    )

    image.paste(
        qr,
        (900, 465),
    )

    image.save(
        destination,
        quality=95,
    )


def tamper_photo(
    source,
    destination,
    different_seed,
):

    image = Image.open(source).convert("RGB")

    replacement = generate_face(
        different_seed
    )

    replacement = replacement.resize(
        (220, 270)
    )

    # Same photo position across all documents
    image.paste(
        replacement,
        (900, 180),
    )

    image.save(
        destination,
        quality=95,
    )


# ============================================================
# PERSON DATASET
# ============================================================

def create_person_dataset(index):

    identity = generate_identity(index)

    person_dir = (
        OUTPUT_DIR
        / f"person_{index:03d}"
    )

    person_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    # --------------------------------------------------------
    # Identity JSON
    # --------------------------------------------------------

    identity_json = {
        **identity,
        "documents": {
            "aadhaar_test": "aadhaar_test.png",
            "passport_test": "passport_test.png",
            "pan_test": "pan_test.png",
        },
    }

    with open(
        person_dir / "identity.json",
        "w",
        encoding="utf-8",
    ) as f:

        json.dump(
            identity_json,
            f,
            indent=2,
        )

    # --------------------------------------------------------
    # Genuine documents
    # --------------------------------------------------------

    aadhaar_path = (
        person_dir
        / "aadhaar_test.png"
    )

    passport_path = (
        person_dir
        / "passport_test.png"
    )

    pan_path = (
        person_dir
        / "pan_test.png"
    )

    create_aadhaar(
        identity,
        aadhaar_path,
    )

    create_passport(
        identity,
        passport_path,
    )

    create_pan(
        identity,
        pan_path,
    )

    # --------------------------------------------------------
    # Tampered documents
    # --------------------------------------------------------

    tamper_passport_name(
        passport_path,
        person_dir
        / "passport_tampered_name.png",
    )

    tamper_pan_name(
        pan_path,
        person_dir
        / "pan_tampered_name.png",
    )

    tamper_aadhaar_qr(
        aadhaar_path,
        person_dir
        / "aadhaar_tampered_qr.png",
    )

    tamper_photo(
        passport_path,
        person_dir
        / "passport_tampered_photo.png",
        identity["identity_id"]
        + "-different-face",
    )

    # --------------------------------------------------------
    # Manifest entries
    # --------------------------------------------------------

    records = []

    records.extend([
        {
            "person_id":
                identity["identity_id"],
            "document_type":
                "aadhaar",
            "filename":
                "aadhaar_test.png",
            "is_tampered":
                0,
            "tamper_type":
                "none",
        },
        {
            "person_id":
                identity["identity_id"],
            "document_type":
                "passport",
            "filename":
                "passport_test.png",
            "is_tampered":
                0,
            "tamper_type":
                "none",
        },
        {
            "person_id":
                identity["identity_id"],
            "document_type":
                "pan",
            "filename":
                "pan_test.png",
            "is_tampered":
                0,
            "tamper_type":
                "none",
        },
        {
            "person_id":
                identity["identity_id"],
            "document_type":
                "passport",
            "filename":
                "passport_tampered_name.png",
            "is_tampered":
                1,
            "tamper_type":
                "name_modification",
        },
        {
            "person_id":
                identity["identity_id"],
            "document_type":
                "passport",
            "filename":
                "passport_tampered_photo.png",
            "is_tampered":
                1,
            "tamper_type":
                "photo_swap",
        },
        {
            "person_id":
                identity["identity_id"],
            "document_type":
                "pan",
            "filename":
                "pan_tampered_name.png",
            "is_tampered":
                1,
            "tamper_type":
                "name_modification",
        },
        {
            "person_id":
                identity["identity_id"],
            "document_type":
                "aadhaar",
            "filename":
                "aadhaar_tampered_qr.png",
            "is_tampered":
                1,
            "tamper_type":
                "qr_mismatch",
        },
    ])

    return records


# ============================================================
# DATASET GENERATION
# ============================================================

def generate_dataset():

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    all_records = []

    print(
        "\nGenerating connected synthetic identities..."
    )

    for i in range(1, NUM_PEOPLE + 1):

        records = create_person_dataset(i)

        all_records.extend(records)

        print(
            f"[{i:03d}/{NUM_PEOPLE}] "
            f"Created person_{i:03d}"
        )

    # ========================================================
    # Dataset manifest
    # ========================================================

    manifest_path = (
        OUTPUT_DIR
        / "dataset_manifest.csv"
    )

    with open(
        manifest_path,
        "w",
        newline="",
        encoding="utf-8",
    ) as f:

        writer = csv.DictWriter(
            f,
            fieldnames=[
                "person_id",
                "document_type",
                "filename",
                "is_tampered",
                "tamper_type",
            ],
        )

        writer.writeheader()

        writer.writerows(
            all_records
        )

    print("\n============================================")
    print("CONNECTED SYNTHETIC DATASET CREATED")
    print("============================================")
    print(
        f"People: {NUM_PEOPLE}"
    )
    print(
        f"Documents: {len(all_records)}"
    )
    print(
        f"Output: {OUTPUT_DIR.resolve()}"
    )
    print(
        f"Manifest: {manifest_path.resolve()}"
    )
    print("============================================")


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    generate_dataset()
