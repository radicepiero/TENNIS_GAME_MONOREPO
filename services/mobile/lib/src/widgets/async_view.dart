import 'package:flutter/material.dart';

class AsyncView<T> extends StatelessWidget {
  final AsyncSnapshot<T> snapshot;
  final Widget Function(T data) builder;

  const AsyncView({super.key, required this.snapshot, required this.builder});

  @override
  Widget build(BuildContext context) {
    if (snapshot.connectionState != ConnectionState.done) {
      return const Center(child: CircularProgressIndicator());
    }

    if (snapshot.hasError) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text(snapshot.error.toString()),
        ),
      );
    }

    final data = snapshot.data;
    if (data == null) {
      return const Center(child: Text('Nessun dato'));
    }

    return builder(data);
  }
}
