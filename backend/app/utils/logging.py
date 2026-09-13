from __future__ import annotations

import logging
import sys


def get_logger(name: str) -> logging.Logger:
    """
    Returns a module-level logger with a consistent format.
    All backend loggers flow through this factory so we can centralise
    level/format changes in one place.
    """
    logger = logging.getLogger(f"pramaansetu.{name}")
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(
            logging.Formatter(
                fmt="%(asctime)s [%(levelname)-8s] %(name)s: %(message)s",
                datefmt="%H:%M:%S",
            )
        )
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        logger.propagate = False
    return logger
