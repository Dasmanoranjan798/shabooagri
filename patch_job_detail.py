import re

with open("mobile-app/lib/features/jobs/presentation/job_detail_screen.dart", "r") as f:
    content = f.read()

# Add imports
if "import '../../../core/widgets/status_badge.dart';" not in content:
    content = content.replace("import 'package:flutter/material.dart';", "import 'package:flutter/material.dart';\nimport '../../../core/widgets/status_badge.dart';\nimport '../../../core/theme/app_theme.dart';")

# 1. Update the main ListView children in build method
# Let's replace the whole ListView children block.
old_list_view = r"ListView\(\s*padding: const EdgeInsets\.all\(16\.0\),\s*children: \[(.*?)_buildActionButtons\(job, isOwnerOrManager, isOwner\)"
# We will use regex to capture the parts, but actually it's easier to just do string replacement.
