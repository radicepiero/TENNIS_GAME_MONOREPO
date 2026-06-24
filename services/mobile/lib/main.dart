import 'package:flutter/material.dart';

import 'src/api/api_client.dart';
import 'src/api/api_context.dart';
import 'src/api/token_store.dart';
import 'src/app.dart';
import 'src/config.dart';

void main() {
  final api = ApiClient(
    apiBase: AppConfig.apiBase(),
    tokenStore: TokenStore(),
  );

  runApp(ApiContext(api: api, child: const TennisApp()));
}
