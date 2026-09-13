from pathlib import Path
import json
import shutil
import zipfile
import re
import math
import random

# ============================================================
# CONFIGURATION
# ============================================================

OUTPUT_DIR = Path("pramaansetu_synthetic_dataset")
ZIP_NAME = Path("pramaansetu_synthetic_dataset.zip")

IMAGE_WIDTH = 1400
IMAGE_HEIGHT = 900

# Optional dependencies used for image generation:
#
#   pip install pillow qrcode
#
# The script also works without qrcode: it will create the
# document images but omit the QR code.
#
try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
except ImportError:
    raise SystemExit(
        "Pillow is required for image generation.\n"
        "Install it with: pip install pillow"
    )

try:
    import qrcode
except ImportError:
    qrcode = None


# ============================================================
# SYNTHETIC PEOPLE
# ============================================================

PEOPLE = [
    {
        "id": "person_001",
        "name": "ARJUN MENON",
        "dob": "14/02/1998",
        "gender": "M",
        "nationality": "INDIAN",
        "address": "42 SYNTHETIC PARK ROAD, KERALA",
        "pan": "ABCPM4821K",
        "scenario": "clean",
    },
    {
        "id": "person_002",
        "name": "ANANYA NAIR",
        "dob": "23/07/1999",
        "gender": "F",
        "nationality": "INDIAN",
        "address": "18 DIGITAL VALLEY, KERALA",
        "pan": "BQWPN5736R",
        "scenario": "clean",
    },
    {
        "id": "person_003",
        "name": "ROHAN PILLAI",
        "dob": "09/11/1997",
        "gender": "M",
        "nationality": "INDIAN",
        "address": "7 TEST COLONY ROAD, KERALA",
        "pan": "CRTPP6842M",
        "scenario": "clean",
    },
    {
        "id": "person_004",
        "name": "MEERA KRISHNAN",
        "dob": "31/01/2000",
        "gender": "F",
        "nationality": "INDIAN",
        "address": "55 INNOVATION STREET, KERALA",
        "pan": "DLMKR7519T",
        "scenario": "aadhaar_mismatch_tampered",
    },
    {
        "id": "person_005",
        "name": "VIVEK VARMA",
        "dob": "05/06/1996",
        "gender": "M",
        "nationality": "INDIAN",
        "address": "91 STARTUP AVENUE, KERALA",
        "pan": "EFGVA3264P",
        "scenario": "passport_mrz_and_pan_invalid",
    },
]


# ============================================================
# VERHOEFF
# ============================================================

D = [
    [0,1,2,3,4,5,6,7,8,9],
    [1,2,3,4,0,6,7,8,9,5],
    [2,3,4,0,1,7,8,9,5,6],
    [3,4,0,1,2,8,9,5,6,7],
    [4,0,1,2,3,9,5,6,7,8],
    [5,9,8,7,6,0,4,3,2,1],
    [6,5,9,8,7,1,0,4,3,2],
    [7,6,5,9,8,2,1,0,4,3],
    [8,7,6,5,9,3,2,1,0,4],
    [9,8,7,6,5,4,3,2,1,0],
]

P = [
    [0,1,2,3,4,5,6,7,8,9],
    [1,5,7,6,2,8,3,0,9,4],
    [5,8,0,3,7,9,6,1,4,2],
    [8,9,1,6,0,4,3,5,2,7],
    [9,4,5,3,1,2,6,8,7,0],
    [4,2,8,6,5,7,3,9,0,1],
    [2,7,9,3,8,0,6,4,1,5],
    [7,0,4,6,9,1,3,2,5,8],
]

INV = [0,4,3,2,1,5,6,7,8,9]


def verhoeff_check_digit(number):
    c = 0
    for i, digit in enumerate(reversed(str(number))):
        c = D[c][P[(i + 1) % 8][int(digit)]]
    return INV[c]


def verhoeff_valid(number):
    c = 0
    for i, digit in enumerate(reversed(str(number))):
        c = D[c][P[i % 8][int(digit)]]
    return c == 0


def generate_aadhaar(seed):
    base = f"{seed:011d}"
    number = base + str(verhoeff_check_digit(base))
    assert len(number) == 12
    assert verhoeff_valid(number)
    return number


# ============================================================
# PASSPORT MRZ
# ============================================================

def mrz_character_value(character):
    if character == "<":
        return 0
    if character.isdigit():
        return int(character)
    if "A" <= character <= "Z":
        return ord(character) - ord("A") + 10
    raise ValueError(f"Invalid MRZ character: {character}")


def mrz_check_digit(value):
    weights = [7, 3, 1]
    total = 0
    for index, character in enumerate(value):
        total += (
            mrz_character_value(character)
            * weights[index % 3]
        )
    return str(total % 10)


def generate_passport(person, index):
    passport_number = f"T{index:07d}"
    passport_field = passport_number + "<"

    day, month, year = person["dob"].split("/")
    dob_mrz = year[-2:] + month + day

    expiry_mrz = f"{35 + index:02d}1215"

    passport_cd = mrz_check_digit(passport_field)
    dob_cd = mrz_check_digit(dob_mrz)
    expiry_cd = mrz_check_digit(expiry_mrz)

    name_parts = person["name"].split()
    surname = name_parts[-1]
    given_names = name_parts[:-1]

    mrz_name = surname
    if given_names:
        mrz_name += "<<" + "<".join(given_names)

    line1 = ("P<IND" + mrz_name)[:44].ljust(44, "<")

    optional_data = "<" * 14

    composite_data = (
        passport_field
        + passport_cd
        + dob_mrz
        + dob_cd
        + expiry_mrz
        + expiry_cd
        + optional_data
    )

    composite_cd = mrz_check_digit(composite_data)

    line2 = (
        passport_field
        + passport_cd
        + "IND"
        + dob_mrz
        + dob_cd
        + person["gender"]
        + expiry_mrz
        + expiry_cd
        + optional_data
        + composite_cd
    )

    line2 = line2[:44].ljust(44, "<")

    assert len(line1) == 44
    assert len(line2) == 44

    return {
        "passport_number": passport_number,
        "mrz_line_1": line1,
        "mrz_line_2": line2,
        "passport_number_check_digit": passport_cd,
        "dob_check_digit": dob_cd,
        "expiry_check_digit": expiry_cd,
        "composite_check_digit": composite_cd,
    }


# ============================================================
# PAN
# ============================================================

PAN_PATTERN = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")


def pan_valid(pan):
    return bool(PAN_PATTERN.fullmatch(pan))


# ============================================================
# FONT HELPERS
# ============================================================

def load_font(size, bold=False, mono=False):
    candidates = []

    if mono:
        candidates += [
            "C:/Windows/Fonts/consola.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
        ]
    elif bold:
        candidates += [
            "C:/Windows/Fonts/arialbd.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        ]
    else:
        candidates += [
            "C:/Windows/Fonts/arial.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ]

    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)

    return ImageFont.load_default()


def rounded_rectangle(draw, xy, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(
        xy,
        radius=radius,
        fill=fill,
        outline=outline,
        width=width,
    )


# ============================================================
# SYNTHETIC FACE IMAGE
# ============================================================

def create_person_image(person, output_path, seed):
    """
    Creates a deterministic synthetic illustrated portrait.

    It is intentionally an illustration rather than a realistic
    photograph so that the dataset cannot be mistaken for a
    real person's biometric photograph.
    """

    random.seed(seed)

    width, height = 700, 900
    img = Image.new("RGB", (width, height), (235, 238, 242))
    draw = ImageDraw.Draw(img)

    # Background
    draw.rectangle(
        [0, 0, width, height],
        fill=(235, 238, 242)
    )

    # Simple shoulders
    draw.ellipse(
        [120, 610, 580, 1030],
        fill=(80, 105, 135)
    )

    # Neck
    draw.rectangle(
        [285, 500, 415, 700],
        fill=(198, 151, 118)
    )

    # Face
    skin_variants = [
        (198, 151, 118),
        (216, 170, 135),
        (181, 132, 103),
        (205, 157, 124),
    ]

    skin = random.choice(skin_variants)

    draw.ellipse(
        [185, 130, 515, 575],
        fill=skin,
        outline=(90, 70, 60),
        width=3
    )

    # Hair
    hair = random.choice([
        (35, 30, 28),
        (55, 40, 30),
        (25, 25, 25),
    ])

    draw.ellipse(
        [175, 80, 525, 330],
        fill=hair
    )

    # Eyes
    eye_y = 330

    draw.ellipse(
        [255, eye_y, 285, eye_y + 20],
        fill=(25, 25, 25)
    )

    draw.ellipse(
        [415, eye_y, 445, eye_y + 20],
        fill=(25, 25, 25)
    )

    # Nose
    draw.line(
        [350, 345, 330, 420, 365, 425],
        fill=(110, 80, 65),
        width=5
    )

    # Mouth
    draw.arc(
        [305, 425, 395, 475],
        start=10,
        end=170,
        fill=(100, 55, 55),
        width=4
    )

    # Ears
    draw.ellipse(
        [160, 320, 205, 420],
        fill=skin
    )

    draw.ellipse(
        [495, 320, 540, 420],
        fill=skin
    )

    # Synthetic label
    font = load_font(28, bold=True)

    text = "SYNTHETIC TEST PERSON"

    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]

    draw.text(
        ((width - tw) / 2, 30),
        text,
        fill=(60, 65, 70),
        font=font
    )

    # Person ID
    small = load_font(22)

    draw.text(
        (20, height - 45),
        person["id"],
        fill=(80, 80, 80),
        font=small
    )

    img.save(output_path, quality=95)


# ============================================================
# SYNTHETIC AADHAAR IMAGE
# ============================================================

def create_aadhaar_image(person, aadhaar_number, qr_payload, output_path, face_path):
    width, height = 1200, 760

    img = Image.new(
        "RGB",
        (width, height),
        (247, 250, 245)
    )

    draw = ImageDraw.Draw(img)

    title_font = load_font(42, bold=True)
    subtitle_font = load_font(24, bold=True)
    label_font = load_font(22, bold=True)
    value_font = load_font(29)
    uid_font = load_font(38, bold=True, mono=True)

    # Border
    draw.rectangle(
        [8, 8, width - 8, height - 8],
        outline=(70, 110, 80),
        width=5
    )

    # Header
    draw.rectangle(
        [12, 12, width - 12, 120],
        fill=(226, 239, 226)
    )

    draw.text(
        (40, 30),
        "PRAMAANSETU",
        fill=(35, 80, 45),
        font=title_font
    )

    draw.text(
        (42, 82),
        "SYNTHETIC RESIDENT ID — TEST ONLY",
        fill=(65, 90, 70),
        font=subtitle_font
    )

    # Photo
    face = Image.open(face_path).convert("RGB")
    face.thumbnail((230, 290))

    photo_x, photo_y = 50, 170

    draw.rectangle(
        [
            photo_x - 5,
            photo_y - 5,
            photo_x + 240,
            photo_y + 300
        ],
        fill=(225, 225, 225),
        outline=(90, 90, 90),
        width=3
    )

    img.paste(
        face.resize((230, 290)),
        (photo_x, photo_y)
    )

    # Fields
    x = 340
    y = 175

    fields = [
        ("NAME", person["name"]),
        ("DATE OF BIRTH", person["dob"]),
        ("GENDER", person["gender"]),
        ("NATIONALITY", person["nationality"]),
        ("ADDRESS", person["address"]),
    ]

    for label, value in fields:

        draw.text(
            (x, y),
            label,
            fill=(75, 75, 75),
            font=label_font
        )

        y += 32

        draw.text(
            (x, y),
            value,
            fill=(25, 25, 25),
            font=value_font
        )

        y += 65

    # Aadhaar-like number
    formatted_uid = (
        f"{aadhaar_number[:4]} "
        f"{aadhaar_number[4:8]} "
        f"{aadhaar_number[8:]}"
    )

    draw.text(
        (50, 590),
        "TEST RESIDENT NUMBER",
        fill=(75, 75, 75),
        font=label_font
    )

    draw.text(
        (50, 625),
        formatted_uid,
        fill=(25, 25, 25),
        font=uid_font
    )

    # QR
    if qrcode is not None:

        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=7,
            border=3,
        )

        qr.add_data(
            json.dumps(
                qr_payload,
                separators=(",", ":")
            )
        )

        qr.make(fit=True)

        qr_img = qr.make_image(
            fill_color="black",
            back_color="white"
        ).convert("RGB")

        qr_img.thumbnail((190, 190))

        img.paste(
            qr_img,
            (940, 150)
        )

        draw.text(
            (960, 345),
            "SYNTHETIC QR",
            fill=(70, 70, 70),
            font=label_font
        )

    draw.text(
        (50, 710),
        "FICTIONAL DOCUMENT FOR PRAMAANSETU TESTING",
        fill=(120, 120, 120),
        font=load_font(18, bold=True)
    )

    img.save(output_path, quality=95)


# ============================================================
# SYNTHETIC PAN IMAGE
# ============================================================

def create_pan_image(person, output_path, face_path, pan_value=None):
    width, height = 1000, 630

    img = Image.new(
        "RGB",
        (width, height),
        (246, 246, 242)
    )

    draw = ImageDraw.Draw(img)

    title_font = load_font(35, bold=True)
    label_font = load_font(21, bold=True)
    value_font = load_font(29)
    pan_font = load_font(42, bold=True, mono=True)

    draw.rectangle(
        [8, 8, width - 8, height - 8],
        outline=(65, 75, 85),
        width=5
    )

    draw.text(
        (40, 35),
        "PRAMAANSETU — PAN TEST CARD",
        fill=(30, 45, 60),
        font=title_font
    )

    draw.text(
        (40, 90),
        "SYNTHETIC / TEST ONLY",
        fill=(130, 60, 60),
        font=label_font
    )

    # Photo
    face = Image.open(face_path).convert("RGB")
    face.thumbnail((210, 260))

    draw.rectangle(
        [50, 160, 270, 430],
        outline=(80, 80, 80),
        width=3
    )

    img.paste(
        face.resize((210, 260)),
        (55, 165)
    )

    x = 330

    draw.text(
        (x, 175),
        "NAME",
        fill=(80, 80, 80),
        font=label_font
    )

    draw.text(
        (x, 210),
        person["name"],
        fill=(25, 25, 25),
        font=value_font
    )

    draw.text(
        (x, 285),
        "PAN",
        fill=(80, 80, 80),
        font=label_font
    )

    draw.text(
        (x, 320),
        pan_value or person["pan"],
        fill=(25, 25, 25),
        font=pan_font
    )

    draw.text(
        (x, 400),
        "DATE OF BIRTH",
        fill=(80, 80, 80),
        font=label_font
    )

    draw.text(
        (x, 435),
        person["dob"],
        fill=(25, 25, 25),
        font=value_font
    )

    draw.text(
        (50, 555),
        "FICTIONAL DOCUMENT FOR PRAMAANSETU TESTING",
        fill=(120, 120, 120),
        font=load_font(18, bold=True)
    )

    img.save(output_path, quality=95)


# ============================================================
# SYNTHETIC PASSPORT IMAGE
# ============================================================

def create_passport_image(person, passport, output_path, face_path):
    width, height = 1200, 800

    img = Image.new(
        "RGB",
        (width, height),
        (238, 244, 250)
    )

    draw = ImageDraw.Draw(img)

    title_font = load_font(38, bold=True)
    label_font = load_font(20, bold=True)
    value_font = load_font(27)
    mrz_font = load_font(28, mono=True)

    draw.rectangle(
        [8, 8, width - 8, height - 8],
        outline=(45, 75, 110),
        width=5
    )

    draw.rectangle(
        [12, 12, width - 12, 120],
        fill=(222, 233, 245)
    )

    draw.text(
        (40, 35),
        "PRAMAANSETU",
        fill=(35, 65, 105),
        font=title_font
    )

    draw.text(
        (42, 82),
        "SYNTHETIC PASSPORT — TEST ONLY",
        fill=(65, 85, 105),
        font=label_font
    )

    # Passport photo
    face = Image.open(face_path).convert("RGB")

    draw.rectangle(
        [55, 165, 335, 490],
        outline=(80, 80, 80),
        width=3
    )

    img.paste(
        face.resize((270, 320)),
        (60, 170)
    )

    # Information
    x = 390

    fields = [
        ("SURNAME / GIVEN NAMES", person["name"]),
        ("PASSPORT NUMBER", passport["passport_number"]),
        ("NATIONALITY", "IND"),
        ("DATE OF BIRTH", person["dob"]),
        ("SEX", person["gender"]),
    ]

    y = 175

    for label, value in fields:

        draw.text(
            (x, y),
            label,
            fill=(80, 80, 80),
            font=label_font
        )

        y += 30

        draw.text(
            (x, y),
            value,
            fill=(25, 25, 25),
            font=value_font
        )

        y += 60

    # MRZ
    draw.rectangle(
        [35, 550, width - 35, 735],
        fill=(225, 225, 225),
        outline=(100, 100, 100),
        width=2
    )

    draw.text(
        (55, 570),
        passport["mrz_line_1"],
        fill=(20, 20, 20),
        font=mrz_font
    )

    draw.text(
        (55, 625),
        passport["mrz_line_2"],
        fill=(20, 20, 20),
        font=mrz_font
    )

    draw.text(
        (55, 700),
        "FICTIONAL DOCUMENT FOR PRAMAANSETU TESTING",
        fill=(120, 120, 120),
        font=load_font(16, bold=True)
    )

    img.save(output_path, quality=95)


# ============================================================
# TEST SCENARIOS / NEGATIVE DOCUMENTS
# ============================================================

def make_invalid_verhoeff_number(valid_number: str) -> str:
    """Change one digit while keeping a 12-digit shape but breaking Verhoeff."""
    digits = list(valid_number)
    for i in range(11):
        original = digits[i]
        digits[i] = "0" if original != "0" else "1"
        candidate = "".join(digits)
        if not verhoeff_valid(candidate):
            return candidate
        digits[i] = original
    raise RuntimeError("Could not create invalid Verhoeff test number")


def make_invalid_mrz(passport: dict) -> dict:
    """Flip the final composite MRZ check digit without changing the fields."""
    out = dict(passport)
    line2 = list(out["mrz_line_2"])
    original = line2[43]
    line2[43] = "0" if original != "0" else "1"
    out["mrz_line_2"] = "".join(line2)
    return out


def make_invalid_pan(pan: str) -> str:
    """Return a deliberately structurally invalid PAN-like value."""
    return pan[:9] + "7"


def add_aadhaar_tamper_overlay(image_path: Path) -> None:
    """Add a visible synthetic edit near the printed identifier.

    This is intentionally obvious enough for the tampering module to flag,
    while leaving the QR code and face untouched.
    """
    img = Image.open(image_path).convert("RGB")
    draw = ImageDraw.Draw(img)
    w, h = img.size
    x1, y1, x2, y2 = int(w * 0.035), int(h * 0.765), int(w * 0.52), int(h * 0.88)
    draw.rectangle([x1, y1, x2, y2], fill=(247, 250, 245))
    draw.rectangle([x1, y1, x2, y2], outline=(180, 70, 70), width=3)
    draw.text((x1 + 12, y1 + 12), "EDITED TEST VALUE", fill=(170, 50, 50), font=load_font(22, bold=True))
    img.save(image_path, quality=95)


# ============================================================
# JSON
# ============================================================

def write_json(path, data):
    path.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    path.write_text(
        json.dumps(
            data,
            indent=2,
            ensure_ascii=False
        ),
        encoding="utf-8"
    )


# ============================================================
# CREATE DATASET
# ============================================================

def create_dataset():

    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)

    if ZIP_NAME.exists():
        ZIP_NAME.unlink()

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    validation_summary = []

    for index, person in enumerate(PEOPLE, start=1):

        person_dir = OUTPUT_DIR / person["id"]

        aadhaar_dir = person_dir / "aadhaar"
        passport_dir = person_dir / "passport"
        pan_dir = person_dir / "pan"
        images_dir = person_dir / "images"

        aadhaar_dir.mkdir(parents=True)
        passport_dir.mkdir(parents=True)
        pan_dir.mkdir(parents=True)
        images_dir.mkdir(parents=True)

        # ---------------------------------------------
        # Generate identifiers
        # ---------------------------------------------

        aadhaar_number = generate_aadhaar(
            35116000000 + index * 137
        )

        passport = generate_passport(
            person,
            index
        )

        scenario = person.get("scenario", "clean")

        # Negative samples deliberately break one or more independent signals.
        printed_aadhaar_number = aadhaar_number
        printed_pan = person["pan"]
        rendered_passport = passport
        aadhaar_qr_payload_number = aadhaar_number
        expected_aadhaar_verhoeff = True
        expected_qr_match = True
        expected_mrz = True
        expected_pan = pan_valid(person["pan"])
        expected_tampering = False

        if scenario == "aadhaar_mismatch_tampered":
            printed_aadhaar_number = make_invalid_verhoeff_number(aadhaar_number)
            # Keep the QR based on the original valid number: printed-vs-QR
            # consistency must fail independently of the checksum.
            aadhaar_qr_payload_number = aadhaar_number
            expected_aadhaar_verhoeff = False
            expected_qr_match = False
            expected_tampering = True

        elif scenario == "passport_mrz_and_pan_invalid":
            rendered_passport = make_invalid_mrz(passport)
            printed_pan = make_invalid_pan(person["pan"])
            expected_mrz = False
            expected_pan = False

        # ---------------------------------------------
        # Generate synthetic face image
        # ---------------------------------------------

        face_path = images_dir / "person.png"

        create_person_image(
            person,
            face_path,
            seed=1000 + index
        )

        # ---------------------------------------------
        # Aadhaar QR payload
        # ---------------------------------------------

        qr_payload = {
            "name": person["name"],
            "dob": person["dob"],
            "gender": person["gender"],
            "aadhaar_number": aadhaar_qr_payload_number,
            "synthetic": True,
        }

        # ---------------------------------------------
        # Generate Aadhaar document image
        # ---------------------------------------------

        aadhaar_image = aadhaar_dir / "aadhaar.png"

        create_aadhaar_image(
            person,
            printed_aadhaar_number,
            qr_payload,
            aadhaar_image,
            face_path
        )

        if expected_tampering:
            add_aadhaar_tamper_overlay(aadhaar_image)

        # ---------------------------------------------
        # Generate PAN document image
        # ---------------------------------------------

        pan_image = pan_dir / "pan.png"

        create_pan_image(
            person,
            pan_image,
            face_path,
            pan_value=printed_pan
        )

        # ---------------------------------------------
        # Generate passport document image
        # ---------------------------------------------

        passport_image = passport_dir / "passport.png"

        create_passport_image(
            person,
            rendered_passport,
            passport_image,
            face_path
        )

        # ---------------------------------------------
        # Person manifest
        # ---------------------------------------------

        person_data = {
            "synthetic_only": True,
            "person_id": person["id"],
            "name": person["name"],
            "dob": person["dob"],
            "gender": person["gender"],
            "nationality": person["nationality"],
            "address": person["address"],
            "aadhaar": aadhaar_number,
            "passport": passport["passport_number"],
            "pan": person["pan"],
            "files": {
                "face": "images/person.png",
                "aadhaar": "aadhaar/aadhaar.png",
                "passport": "passport/passport.png",
                "pan": "pan/pan.png",
            },
        }

        write_json(
            person_dir / "person.json",
            person_data
        )

        # ---------------------------------------------
        # Aadhaar JSON
        # ---------------------------------------------

        aadhaar_data = {
            "document_type": "aadhaar",
            "synthetic_only": True,
            "name": person["name"],
            "aadhaar_number": printed_aadhaar_number,
            "dob": person["dob"],
            "gender": person["gender"],
            "address": person["address"],
            "qr_payload": qr_payload,
            "image": "aadhaar.png",
            "expected_validation": {
                "verhoeff_checksum_pass": expected_aadhaar_verhoeff,
                "qr_signature_valid": True,
                "qr_field_match": expected_qr_match,
                "field_consistency_pass": expected_qr_match,
                "tampering_expected": expected_tampering,
            },
        }

        write_json(
            aadhaar_dir / "data.json",
            aadhaar_data
        )

        # ---------------------------------------------
        # Passport JSON
        # ---------------------------------------------

        passport_data = {
            "document_type": "passport",
            "synthetic_only": True,
            "name": person["name"],
            "passport_number": rendered_passport["passport_number"],
            "dob": person["dob"],
            "gender": person["gender"],
            "nationality": "IND",
            "mrz_line_1": rendered_passport["mrz_line_1"],
            "mrz_line_2": rendered_passport["mrz_line_2"],
            "image": "passport.png",
            "expected_validation": {
                "mrz_checksum_pass": expected_mrz,
            },
            "mrz_check_digits": {
                "passport_number": passport["passport_number_check_digit"],
                "dob": passport["dob_check_digit"],
                "expiry": passport["expiry_check_digit"],
                "composite": passport["composite_check_digit"],
            },
        }

        write_json(
            passport_dir / "data.json",
            passport_data
        )

        # ---------------------------------------------
        # PAN JSON
        # ---------------------------------------------

        pan_data = {
            "document_type": "pan",
            "synthetic_only": True,
            "name": person["name"],
            "pan": printed_pan,
            "image": "pan.png",
            "expected_validation": {
                "pan_structure_valid": expected_pan,
            },
        }

        write_json(
            pan_dir / "data.json",
            pan_data
        )

        # ---------------------------------------------
        # Validation summary
        # ---------------------------------------------

        validation_summary.append({
            "person_id": person["id"],
            "name": person["name"],
            "scenario": scenario,
            "aadhaar": printed_aadhaar_number,
            "aadhaar_verhoeff_valid": expected_aadhaar_verhoeff,
            "qr_field_match_expected": expected_qr_match,
            "tampering_expected": expected_tampering,
            "pan": printed_pan,
            "pan_structure_valid": expected_pan,
            "passport": rendered_passport["passport_number"],
            "passport_mrz_check_digits_valid": expected_mrz,
        })

        print(
            f"[OK] {person['id']} "
            f"{person['name']} "
            f"| Aadhaar={aadhaar_number} "
            f"| PAN={person['pan']} "
            f"| Passport={passport['passport_number']}"
        )

    # ========================================================
    # README
    # ========================================================

    readme = """
# PramaanSetu Synthetic Identity Dataset

This dataset is synthetic test data for the PramaanSetu
document-screening project.

It contains NO real government-issued credentials.

## Structure

person_001/
├── person.json
├── images/
│   └── person.png
├── aadhaar/
│   ├── data.json
│   └── aadhaar.png
├── passport/
│   ├── data.json
│   └── passport.png
└── pan/
    ├── data.json
    └── pan.png

## Generated images

The script generates:

1. A separate synthetic face image.
2. A synthetic Aadhaar-style document.
3. A synthetic passport-style document with MRZ.
4. A synthetic PAN-style document.

The face is deliberately an illustrated synthetic portrait,
not a real person's photograph.

## Positive and negative samples

The dataset intentionally contains both clean and failing documents:

- person_001 to person_003: clean documents; identifiers/checks should pass.
- person_004: printed Aadhaar number is corrupted, QR contains the original
  number, and a visible synthetic edit is added; checksum/QR consistency and
  tampering checks should fail/flag.
- person_005: passport MRZ composite check digit is corrupted and PAN has an
  invalid structure; those validations should fail.

Use the `scenario` field in `validation_summary.json` to build positive and
negative evaluation splits.

## Validation

Aadhaar:
- 12 digits
- Verhoeff-valid
- Synthetic QR payload contains matching fields

Passport:
- TD3-style two-line MRZ
- ICAO 7-3-1 check digits
- Passport number, DOB, expiry and composite check digits
  are internally generated

PAN:
- Matches the project's structural PAN regex

## QR

If the qrcode package is installed, the Aadhaar image contains
a QR code generated from the synthetic qr_payload.

Install:

    pip install pillow qrcode

## Testing PramaanSetu

Use:

    person_001/aadhaar/aadhaar.png
    person_001/passport/passport.png
    person_001/pan/pan.png

as document inputs to Module 1.

Use:

    person_001/images/person.png

as the separate reference image for Module 4.

## Important

All documents and identifiers are synthetic.

Do not represent them as real Aadhaar, PAN or passport
credentials.
"""

    (OUTPUT_DIR / "README.md").write_text(
        readme.strip(),
        encoding="utf-8"
    )

    write_json(
        OUTPUT_DIR / "validation_summary.json",
        validation_summary
    )

    # ========================================================
    # ZIP
    # ========================================================

    with zipfile.ZipFile(
        ZIP_NAME,
        "w",
        zipfile.ZIP_DEFLATED
    ) as archive:

        for file in OUTPUT_DIR.rglob("*"):

            if file.is_file():

                archive.write(
                    file,
                    file.relative_to(
                        OUTPUT_DIR.parent
                    )
                )

    print()
    print("=" * 70)
    print("PRAMAANSETU SYNTHETIC DATASET GENERATED")
    print("=" * 70)
    print(f"Folder: {OUTPUT_DIR}")
    print(f"ZIP:    {ZIP_NAME}")
    print()
    print("Images generated:")
    print("  - images/person.png")
    print("  - aadhaar/aadhaar.png")
    print("  - passport/passport.png")
    print("  - pan/pan.png")


if __name__ == "__main__":
    create_dataset()
