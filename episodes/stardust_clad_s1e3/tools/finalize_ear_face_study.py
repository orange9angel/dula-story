"""Package the observed October 21 local studies; does not evaluate images."""
import copy
import hashlib
import json
import sys
import zipfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

E = Path(__file__).resolve().parents[1]
W = E.parents[2]
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()


def write(p, data):
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def board(name, rows):
    out = E / "storyboard" / name
    image = Image.new("RGB", (1200, len(rows) * 300), "#14232d")
    draw = ImageDraw.Draw(image)
    manifest = []
    for row, cells in enumerate(rows):
        for col, (label, source, box) in enumerate(cells):
            source = E / source
            raw = Image.open(source).convert("RGB")
            cropped = raw.crop(box) if box else raw
            fit = ImageOps.contain(cropped, (380, 260))
            x, y = col * 400, row * 300
            draw.text((x + 8, y + 8), label, fill="white")
            image.paste(fit, (x + (400 - fit.width) // 2, y + 32 + (260 - fit.height) // 2))
            manifest.append(dict(label=label, source=str(source.relative_to(E)), sha256=sha(source), crop=box))
    image.save(out / "details.jpg", quality=95)
    write(out / "details_manifest.json", manifest)


if "--boards" in sys.argv:
    h = "storyboard/hair_ear_coverage_r9/preview/"
    board("hair_ear_coverage_r9", [
        [("Reference: ear-root relation, different design", "tmp/hair_tutorial_20261020/6051_38.png", None),
         ("R4: ear-back / neck wedge", h+"left_profile.jpg", (230,325,470,580)),
         ("R9: ear-back to neck-side coverage", h+"left_profile.jpg", (870,325,1110,580))],
        [("User reference: local hair / ear relation", "storyboard/hair_fine_reference/user_reference.png", (0,65,110,178)),
         ("R4: opposite profile", h+"right_profile.jpg", (170,325,410,580)),
         ("R9: opposite profile", h+"right_profile.jpg", (810,325,1050,580))],
        [("R7: new skin slits during pitch", "storyboard/hair_ear_coverage_r7/preview/front_down.jpg", (890,225,1040,330)),
         ("R4: central parting", h+"front.jpg", (275,215,395,320)),
         ("R9: small central root fill", h+"front.jpg", (915,215,1035,320))]
    ])
    f = "storyboard/face_ink_r2/render/shot_01.jpg"
    ref = "trials/face-ink-study/user_reference.png"
    board("face_ink_r2", [
        [("User reference: different pose / lighting", ref, None),
         ("Baseline: same head and current hair", f, (160,290,465,555)),
         ("Candidate: same head and current hair", f, (800,290,1105,555))],
        [("Reference: iris / reflection relation", ref, (87,3,207,80)),
         ("Baseline: tall pupil and small reflection", f, (220,355,305,400)),
         ("Candidate: rounder pupil / lower reflections", f, (860,355,945,400))],
        [("Reference: short facial plane accents", ref, (60,68,185,140)),
         ("Baseline: nose / under-eye region", f, (225,397,400,465)),
         ("Candidate: restrained warm plane lines", f, (865,397,1040,465))]
    ])
    print("Comparison boards generated; inspect them before packaging review records.")
    sys.exit(0)


template = json.loads((E/"storyboard/character_attention/hair_nape_ears_r5.json").read_text(encoding="utf-8"))
for name, duration in [("hair_ear_coverage_r9", 16), ("face_ink_r2", 12)]:
    face = name.startswith("face_")
    out = E/"storyboard"/name
    video = E/"output"/f"stardust_clad_s1e3_{name}.mp4"
    build = json.loads((out/"render/render_build.json").read_text(encoding="utf-8"))
    with zipfile.ZipFile(out/"source_snapshot.zip", "w", zipfile.ZIP_DEFLATED) as z:
        for item in build["build"]["inputs"]:
            p = Path(item["path"])
            assert sha(p) == item["sha256"], str(p)
            if p.suffix in {".js", ".mjs", ".html", ".story"} and p.is_relative_to(W):
                z.write(p, p.relative_to(W).as_posix())
    def ev(path, at, method="still"):
        return dict(path="../"+name+"/"+path, sha256=sha(out/path), window="study", at=at, method=method)
    decoded = json.loads((out/"decoded/manifest.json").read_text(encoding="utf-8"))
    evidence = [ev("decoded/"+b["path"], b["at"], "ordered_frames") for b in decoded["boards"]]
    evidence += [ev("details.jpg", [.5] if face else [.5,5,7])]
    if not face:
        evidence += [ev("preview/front.jpg", [.5]), ev("preview/front_down.jpg", [12.5])]
    trace = json.loads((out/"trace.json").read_text(encoding="utf-8"))
    seek = json.loads((out/"render/seek_check.json").read_text(encoding="utf-8"))
    limits = "Selected stills and ordered decoded frames only; no normal-speed playback, full episode integration, reference-matched dynamics or artistic equivalence claim."
    manifest = dict(video=str(video.relative_to(E)), sha256=sha(video),
                    source_snapshot_sha256=sha(out/"source_snapshot.zip"),
                    source_snapshot_note="Code snapshot only; runtime packages and textures remain in workspace.",
                    frames=len(trace["frames"]), fps=trace["fps"], duration=trace["duration"],
                    seek_passed=seek["passed"], seek_samples=len(seek["checks"]),
                    non_finite=sum(f["nonFinite"] for f in trace["frames"]),
                    max_root_shift=max(f["maxRootShift"] for f in trace["frames"]),
                    max_tip_shift=max(f["maxTipShift"] for f in trace["frames"]),
                    geometry_metric_scope="Existing animated hair parts only; the static ear wrap is not part of these lag metrics.",
                    observed_evidence=evidence, limitations=limits,
                    production_video_sha256=sha(E/"output/stardust_clad_s1e3_windsieve_trial_r1.mp4"))
    write(out/"manifest.json", manifest)
    r = copy.deepcopy(template)
    r["source"] = dict(path="../../output/"+video.name, sha256=sha(video))
    r["scope"]["windows"] = [dict(id="study", start=0, end=duration)]
    r["scope"]["accepted_properties"] = (
        ["Same head geometry, hair R9, armor, lights, gaze and blink in both panes.",
         "Keep the established green iris, mole and eye aperture; add restrained graphic detail."]
        if face else
        ["User said R4 was much better, then identified remaining ear-back coverage and wig feel.",
         "Compare with R4; extend locally toward neck-side and add a little central root coverage.",
         "Same face, ears, armor, pose and camera in both panes. No whole-cap enlargement."])
    r["scope"]["limitations"] = limits
    def issue(id, dim, origin, status, fact, impact, hypothesis, next_action, **extra):
        return dict(id=id, subject="xiaozao", dimension=dim, origin=origin, status=status,
                    fact=fact, impact=impact, priority="high", hypothesis=hypothesis,
                    next_action=next_action, evidence=evidence, **extra)
    if face:
        r["issues"] = [
            issue("F01","face_structure","user_reported","fixed",
                  "The baseline has a very tall dark pupil, weak lower iris separation and faint facial plane accents; small catchlights already existed.",
                  "Eye depth and local facial structure are weak at the study scale.",
                  "The painted pupil and iris values dominate the eye; small white dots alone cannot establish the intended appearance.",
                  "Recheck under episode lighting and at actual shot sizes.",
                  change="Rounder pupil, layered lower iris paint and reflections, sparse warm under-eye and nose lines on the existing UV.",
                  result="The reviewed comparison shows rounder dark pupils, visible lower reflections and clearer small plane accents; no anatomical remodel claimed.",
                  verification=evidence),
            issue("F02","expression","self_found","open",
                  "The trial still uses a restrained generic face performance; added ink does not provide the reference expression or flesh deformation.",
                  "The reference-level expressive goal remains unmet.",
                  "Facial geometry, acting design and mouth deformation are unchanged.",
                  "Apply a narrative expression test before claiming a performance improvement.")
        ]
        observed = {
            "identity": ("no_issue_observed","Iris color, eye aperture, mole and head silhouette remain recognizable.",[]),
            "face_structure": ("finding","F01 describes the local graphic improvement, not a complete anatomy pass.",["F01"]),
            "gaze": ("no_issue_observed","In sampled gaze changes, iris paint and highlights move together inside the original opening.",[]),
            "expression": ("finding","Blink clipping works in sampled open/half/closed phases; broader expression remains generic.",["F02"]),
            "hair": ("no_issue_observed","Both panes use the same R9 hair. Its separate unresolved shape limitations remain in the hair record.",[]),
            "shot_integration": ("no_issue_observed","Details read in the front close-up and remain surface-bound in sampled turns; extreme profile compresses them.",[]),
            "open_scan": ("no_issue_observed","Returned to complete head views; no additional separate regression asserted beyond the listed limited performance.",[]),
        }
        r["iterations"] = [dict(id="face-r1-r2", change="Opt-in curved UV graphic details; R2 also carries the repaired hair root in both panes.",
                                result="Local eye/line improvement, sampled blink and gaze clipping retained.", after=evidence)]
        r["misses"] = [dict(id="feature-existence-versus-readability", origin="user_reported",
                           prior_judgment="Baseline already contained a white eye reflection.",
                           later_finding="User asked for the reference's visible eye and facial ink treatment; having a small dot did not provide comparable readability.",
                           lesson="Compare pupil, iris values, reflection shape and normal-size readability separately.",
                           validation_status="Prompted trial only, no cross-character blind test.")]
    else:
        r["issues"] = [
            issue("C01","hair","user_reported","fixed",
                  "Previous endpoint-length fixes left an exposed wedge over and behind the ear; even R4 did not cover enough toward the neck-side.",
                  "The hair can read as a detached cap.",
                  "Length checks did not trace the whole ear-front/top/back/neck boundary.",
                  "Recheck ear-root coverage in future acting poses.",
                  change="Local wrap with an ear opening, joined lower return, tapered neck-side extension and unequal hem.",
                  result="Reviewed profiles and rear pitch show continuous coverage nearer the ear and down to the neck-side. Global wig feel remains C03.",
                  verification=evidence),
            issue("C02","hair","user_reported","fixed",
                  "User identified a small bare-looking central parting in the frontal hairline.",
                  "The central root opening interrupts the desired fullness.",
                  "The visible forelock edge and its backing depth both need local coverage.",
                  "Retain the requested small fill and check it in new head pitches.",
                  change="Small central forelock plus local root backing; no global forehead recession.",
                  result="Central exposed notch is reduced; the two skin slits introduced in R7 are absent in reviewed R9 pitched views.",
                  verification=evidence),
            issue("C03","identity","user_reported","open",
                  "Broad crown/posterior shapes and the side/back transition still have a rigid wig-like quality.",
                  "Whole-hair naturalness is not accepted.",
                  "Inherited coarse main silhouettes and light planes remain.",
                  "Redesign the main posterior contour and light shapes with a separate comparable sample."),
            issue("C04","shot_integration","self_found","open",
                  "Some inherited light planes retain band-like shapes and abrupt ends.",
                  "Surface paint does not yet fully describe flowing hair.",
                  "Old main-lock highlight coordinates remain unchanged.",
                  "Refine light-plane design on the final geometry without breaking the continuous dark mass.")
        ]
        observed = {
            "identity": ("finding","Local coverage improves, while the large hair mass remains rigid.",["C03"]),
            "face_structure": ("no_issue_observed","Ear visibility and unchanged facial drawing remain readable in reviewed local comparisons.",[]),
            "hair": ("finding","C01 and C02 improve the requested coverage and central root; this does not close global shape criticism.",["C01","C02"]),
            "shot_integration": ("finding","Existing highlight bands remain visible in profile and rear views.",["C04"]),
            "open_scan": ("no_issue_observed","Returned from crops to complete heads and sampled turns; no additional separate defect asserted beyond remaining mass/lighting limitations.",[]),
        }
        r["iterations"] = [
            dict(id="r1-r4",change="Wrap ear top/back and join to nape.",result="Rejected R1/R2 oversized panels and R3 oblique slots; R4 user feedback: much better, still incomplete."),
            dict(id="r5-r9",change="Extend toward neck-side and fill the central root.",
                 result="R5 hangs as a slab and cap-only front edit is invisible; R6 broad forelock edit enlarges the opening; R7 local fill exposes two skin slits on pitch; R8 depth remains insufficient; R9 local backing closes the observed slits.", after=evidence)
        ]
        r["misses"] = [dict(id="endpoint-versus-region",origin="user_reported",
                           prior_judgment="Sideburn and nape endpoints were lengthened.",
                           later_finding="Ear-top/back regions between them still lacked coverage, then R4 still needed more neck-side fill.",
                           lesson="Trace the complete adjacent region, distinguish coverage from natural shape, and test repair side effects in pitch.",
                           validation_status="User-prompted same-character repair; no autonomous general-quality claim.")]
    observed["temporal"] = ("needs_evidence","Only timestamped decoded sequences were inspected. Normal-speed naturalness, unsampled transitions and full episode behavior remain unreviewed.",[])
    for check in r["checks"]:
        dim = check["dimension"]
        if dim in observed:
            check["status"],check["observation"],check["issue_ids"] = observed[dim]
            check["evidence"] = evidence
            check["next_action"] = "Review normal-speed playback and final episode shots before dynamic acceptance." if dim=="temporal" else ""
        else:
            check.update(status="not_applicable", observation="Not part of this silent local head study; whole episode, sound and body performance unchanged.",
                         issue_ids=[],evidence=[],next_action="")
    r["reviewer_conclusion"] = "Observed local improvements only. " + limits
    write(E/"storyboard/character_attention"/(name+".json"),r)
    print(json.dumps({k:manifest[k] for k in ["video","frames","seek_passed","seek_samples","non_finite","max_root_shift","production_video_sha256"]}))
